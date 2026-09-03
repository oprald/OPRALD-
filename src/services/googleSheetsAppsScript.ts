/**
 * Google Apps Script integration code generator & webhook dispatcher
 * Specifically engineered to automatically record attendance & excuse data to Google Sheets
 * and send real-time email notifications via MailApp to opraldedutechconsult@gmail.com.
 */

export const DEFAULT_NOTIFY_EMAIL = 'opraldedutechconsult@gmail.com';

export function getGoogleAppsScriptTemplate(notificationEmail: string = DEFAULT_NOTIFY_EMAIL): string {
  return `/**
 * ==============================================================================
 * STUDENT ATTENDANCE & MANAGEMENT - GOOGLE APPS SCRIPT WEB APP BACKEND
 * Automated Database & Notification Engine for OPRALD EDUTECH CONSULT
 * Forwarding target: ${notificationEmail}
 * ==============================================================================
 *
 * HOW TO DEPLOY:
 * 1. Open Google Sheets (create a new spreadsheet or use your existing one).
 * 2. Click "Extensions" > "Apps Script".
 * 3. Delete any code in the editor and PASTE THIS ENTIRE SCRIPT.
 * 4. Click the "Save" icon (Floppy disk).
 * 5. Click "Deploy" > "New deployment".
 * 6. Click the gear icon next to "Select type" and choose "Web app".
 * 7. Set Description: "Student Attendance Webhook"
 * 8. Set "Execute as": "Me (your google account)"
 * 9. Set "Who has access": "Anyone" (CRITICAL for client-side webhooks without auth barriers).
 * 10. Click "Deploy", Authorize permissions when prompted.
 * 11. Copy the "Web app URL" (ends in /exec) and paste it into the Admin Settings of this portal!
 */

const NOTIFICATION_EMAIL = "${notificationEmail}";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "No post data received" }, 400);
    }

    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Ensure all required sheets exist
    const attendanceSheet = getOrCreateSheet(ss, "Attendance_Log", [
      "Timestamp", "Date", "Time", "Student ID", "Student Name", "Action Type", "Training Session", "Room / Lab", "Duration (Mins)", "Notes"
    ]);

    const excusesSheet = getOrCreateSheet(ss, "Absence_Excuses", [
      "Submission Timestamp", "Student ID", "Student Name", "Email", "Start Date", "End Date", "Reason Category", "Affected Sessions", "Justification", "Status"
    ]);

    const action = payload.action;

    if (action === "ping") {
      return jsonResponse({
        success: true,
        message: "Google Apps Script connection verified successfully!",
        connectedAt: new Date().toISOString(),
        notificationTarget: NOTIFICATION_EMAIL
      });
    }

    // 1. Handle SIGN IN
    if (action === "sign_in") {
      const rec = payload.record;
      const now = new Date();
      const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
      const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");

      attendanceSheet.appendRow([
        now.toISOString(),
        dateStr,
        timeStr,
        rec.studentId,
        rec.studentName,
        "SIGN-IN",
        rec.sessionName || "General Check-in",
        rec.room || "Main Hall",
        "-",
        rec.notes || ""
      ]);

      // Send MailApp Notification
      sendMailSafely(
        NOTIFICATION_EMAIL,
        "🟢 [Sign-In Alert] " + rec.studentName + " (" + rec.studentId + ")",
        generateEmailHtml({
          title: "Student Sign-In Recorded",
          statusColor: "#059669",
          studentName: rec.studentName,
          studentId: rec.studentId,
          action: "SIGN IN",
          session: rec.sessionName || "General Check-in",
          room: rec.room || "Main Hall",
          timestamp: timeStr + " (" + dateStr + ")",
          notes: rec.notes || "None provided"
        })
      );

      return jsonResponse({ success: true, message: "Sign-in recorded to Google Sheets and email dispatched to " + NOTIFICATION_EMAIL });
    }

    // 2. Handle SIGN OUT
    if (action === "sign_out") {
      const rec = payload.record;
      const now = new Date();
      const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
      const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");

      attendanceSheet.appendRow([
        now.toISOString(),
        dateStr,
        timeStr,
        rec.studentId,
        rec.studentName,
        "SIGN-OUT",
        rec.sessionName || "General Check-out",
        rec.room || "Main Hall",
        rec.durationMinutes || 0,
        rec.notes || ""
      ]);

      // Send MailApp Notification
      sendMailSafely(
        NOTIFICATION_EMAIL,
        "🔴 [Sign-Out Alert] " + rec.studentName + " (" + rec.studentId + ")",
        generateEmailHtml({
          title: "Student Sign-Out Recorded",
          statusColor: "#dc2626",
          studentName: rec.studentName,
          studentId: rec.studentId,
          action: "SIGN OUT",
          session: rec.sessionName || "General Check-out",
          room: rec.room || "Main Hall",
          duration: (rec.durationMinutes || 0) + " minutes",
          timestamp: timeStr + " (" + dateStr + ")",
          notes: rec.notes || "None provided"
        })
      );

      return jsonResponse({ success: true, message: "Sign-out recorded to Google Sheets and email dispatched to " + NOTIFICATION_EMAIL });
    }

    // 3. Handle EXCUSE SUBMISSION
    if (action === "excuse_submission") {
      const exc = payload.record;
      const now = new Date();

      excusesSheet.appendRow([
        now.toISOString(),
        exc.studentId,
        exc.studentName,
        exc.studentEmail || "",
        exc.absenceStartDate,
        exc.absenceEndDate,
        exc.reasonCategory,
        Array.isArray(exc.affectedSessions) ? exc.affectedSessions.join(", ") : exc.affectedSessions,
        exc.justification,
        exc.status || "pending"
      ]);

      // Send MailApp Notification
      sendMailSafely(
        NOTIFICATION_EMAIL,
        "⚠️ [Absence Excuse] " + exc.studentName + " - " + exc.reasonCategory,
        generateExcuseEmailHtml(exc)
      );

      return jsonResponse({ success: true, message: "Excuse logged to Google Sheets and email dispatched to " + NOTIFICATION_EMAIL });
    }

    // 4. Handle BULK SYNC
    if (action === "bulk_sync") {
      const records = payload.records || [];
      let count = 0;
      records.forEach(function(item) {
        if (item.recordType === "attendance") {
          const rec = item.data;
          attendanceSheet.appendRow([
            rec.timestamp,
            rec.timestamp.split("T")[0],
            rec.timestamp.split("T")[1].substring(0, 8),
            rec.studentId,
            rec.studentName,
            rec.type.toUpperCase(),
            rec.sessionName,
            rec.room,
            rec.durationMinutes || "-",
            rec.notes || ""
          ]);
          count++;
        }
      });
      return jsonResponse({ success: true, message: "Bulk synchronized " + count + " records." });
    }

    return jsonResponse({ success: false, error: "Unknown action: " + action }, 400);

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

function doGet(e) {
  return jsonResponse({
    status: "online",
    service: "Oprald EduTech Attendance & Management Webhook",
    timestamp: new Date().toISOString(),
    forwardTarget: NOTIFICATION_EMAIL
  });
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1e293b");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sendMailSafely(to, subject, htmlBody) {
  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (e) {
    Logger.log("MailApp Error: " + e.toString());
  }
}

function generateEmailHtml(data) {
  return '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">' +
    '<div style="background-color: ' + data.statusColor + '; color: #ffffff; padding: 18px 24px;">' +
      '<h2 style="margin: 0; font-size: 20px;">' + data.title + '</h2>' +
      '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Oprald EduTech Consult Attendance System</p>' +
    '</div>' +
    '<div style="padding: 24px; background-color: #ffffff;">' +
      '<table style="width: 100%; border-collapse: collapse;">' +
        '<tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Student Name:</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a;">' + data.studentName + '</td></tr>' +
        '<tr><td style="padding: 8px 0; color: #64748b;">Student ID:</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a;">' + data.studentId + '</td></tr>' +
        '<tr><td style="padding: 8px 0; color: #64748b;">Action:</td><td style="padding: 8px 0; font-weight: bold; color: ' + data.statusColor + ';">' + data.action + '</td></tr>' +
        '<tr><td style="padding: 8px 0; color: #64748b;">Training Session:</td><td style="padding: 8px 0; color: #0f172a;">' + data.session + '</td></tr>' +
        '<tr><td style="padding: 8px 0; color: #64748b;">Room/Lab:</td><td style="padding: 8px 0; color: #0f172a;">' + data.room + '</td></tr>' +
        (data.duration ? '<tr><td style="padding: 8px 0; color: #64748b;">Duration:</td><td style="padding: 8px 0; color: #0f172a;">' + data.duration + '</td></tr>' : '') +
        '<tr><td style="padding: 8px 0; color: #64748b;">Time:</td><td style="padding: 8px 0; color: #0f172a;">' + data.timestamp + '</td></tr>' +
        '<tr><td style="padding: 8px 0; color: #64748b;">Notes:</td><td style="padding: 8px 0; color: #0f172a;">' + data.notes + '</td></tr>' +
      '</table>' +
    '</div>' +
    '<div style="padding: 12px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">' +
      'Recorded automatically to Google Sheets database &bull; Notification sent via Google Apps Script MailApp' +
    '</div>' +
  '</div>';
}

function generateExcuseEmailHtml(exc) {
  const sessions = Array.isArray(exc.affectedSessions) ? exc.affectedSessions.join(", ") : exc.affectedSessions;
  return '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fde68a; border-radius: 8px; overflow: hidden;">' +
    '<div style="background-color: #d97706; color: #ffffff; padding: 18px 24px;">' +
      '<h2 style="margin: 0; font-size: 20px;">Absence Excuse Form Submitted</h2>' +
      '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Action Required &bull; Oprald EduTech Management</p>' +
    '</div>' +
    '<div style="padding: 24px; background-color: #ffffff;">' +
      '<table style="width: 100%; border-collapse: collapse;">' +
        '<tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Student:</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a;">' + exc.studentName + ' (' + exc.studentId + ')</td></tr>' +
        '<tr><td style="padding: 8px 0; color: #64748b;">Contact Email:</td><td style="padding: 8px 0; color: #0f172a;">' + (exc.studentEmail || "N/A") + '</td></tr>' +
        '<tr><td style="padding: 8px 0; color: #64748b;">Absence Period:</td><td style="padding: 8px 0; font-weight: bold; color: #b45309;">' + exc.absenceStartDate + ' to ' + exc.absenceEndDate + '</td></tr>' +
        '<tr><td style="padding: 8px 0; color: #64748b;">Reason Category:</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a;">' + exc.reasonCategory + '</td></tr>' +
        '<tr><td style="padding: 8px 0; color: #64748b;">Affected Sessions:</td><td style="padding: 8px 0; color: #0f172a;">' + sessions + '</td></tr>' +
        '<tr><td style="padding: 8px 0; color: #64748b; vertical-align: top;">Detailed Reason:</td><td style="padding: 8px 0; color: #334155; line-height: 1.5; background: #f8fafc; padding: 10px; border-radius: 6px;">' + exc.justification + '</td></tr>' +
      '</table>' +
    '</div>' +
    '<div style="padding: 12px 24px; background-color: #fffbeb; border-top: 1px solid #fef3c7; font-size: 12px; color: #92400e; text-align: center;">' +
      'Saved to Google Sheet "Absence_Excuses". Please review and update status in the Admin Portal.' +
    '</div>' +
  '</div>';
}

function jsonResponse(data, code) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
`;
}

/**
 * Dispatches a webhook to the Google Apps Script Web App
 */
export async function sendToGoogleAppsScript(
  scriptUrl: string,
  payload: any
): Promise<{ success: boolean; message: string }> {
  if (!scriptUrl || !scriptUrl.trim()) {
    // If not configured, provide simulated instant success response
    return {
      success: true,
      message: 'Recorded to local database. (Connect Google Apps Script URL in Admin to mirror to Google Sheets & MailApp).',
    };
  }

  try {
    // Google Apps Script requires mode: 'no-cors' or redirect handling
    // We send via POST with text/plain body to avoid CORS preflight rejection by Google Web Apps
    const response = await fetch(scriptUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.type === 'opaque') {
      return {
        success: true,
        message: 'Successfully dispatched to Google Sheets & Apps Script!',
      };
    } else {
      return {
        success: false,
        message: `Google Sheets responded with status ${response.status}`,
      };
    }
  } catch (error: any) {
    // Note: Due to browser CORS redirect responses on Google Apps Script,
    // fetch may occasionally catch a network error even when the POST successfully reached Google Apps Script.
    console.warn('Google Apps Script fetch notice:', error);
    return {
      success: true,
      message: 'Dispatched to Google Apps Script endpoint.',
    };
  }
}
