"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAdminNotification = void 0;
const resend_1 = require("resend");
// Initialize with dummy key if not provided, just so it doesn't crash.
// In a real scenario, you would have RESEND_API_KEY in your .env.
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 're_dummy_key');
const sendAdminNotification = (subject, body) => __awaiter(void 0, void 0, void 0, function* () {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@paperrentel.com';
    if (!process.env.RESEND_API_KEY) {
        console.log('[Email Simulation] To Admin:', subject);
        console.log('[Email Simulation] Body:', body);
        return;
    }
    try {
        yield resend.emails.send({
            from: 'PaperRentel System <noreply@paperrentel.com>', // Resend requires a verified domain if using a custom email
            to: adminEmail,
            subject: `[Admin Alert] ${subject}`,
            html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
        });
    }
    catch (err) {
        console.error('Failed to send admin notification email:', err);
    }
});
exports.sendAdminNotification = sendAdminNotification;
