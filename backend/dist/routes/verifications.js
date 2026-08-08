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
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const cloudinary_1 = require("../lib/cloudinary");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.post('/upload', auth_1.protect, cloudinary_1.uploadID.single('document'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No document uploaded.' });
            return;
        }
        const idDocumentUrl = req.file.path;
        // Fetch user to check current status
        const user = yield prisma_1.prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }
        // Don't allow upload if permanently blocked
        if (user.verificationStatus === client_1.VerificationStatus.permanently_blocked) {
            res.status(403).json({ message: 'Your account is permanently blocked from verification.' });
            return;
        }
        // Don't allow upload if already verified
        if (user.verificationStatus === client_1.VerificationStatus.verified) {
            res.status(400).json({ message: 'Your account is already verified.' });
            return;
        }
        // Update user: status -> pending, and store the private URL
        yield prisma_1.prisma.user.update({
            where: { id: req.userId },
            data: {
                verificationStatus: client_1.VerificationStatus.pending,
                idDocumentUrl
            }
        });
        res.status(200).json({ message: 'Document uploaded successfully. Status is now pending.' });
    }
    catch (err) {
        console.error('[POST /api/verifications/upload]', err);
        res.status(500).json({ message: 'Failed to upload document.' });
    }
}));
exports.default = router;
