

function encryptData(data) {
    const encryptor = require('simple-encryptor')({
        key: process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "12344321",
        hmac: false,
        debug: true
    });

    const encryptedData = encryptor.encrypt(data);
    return encryptedData;
}

function decryptData(encryptedData) {
    const encryptor = require('simple-encryptor')({
        key: process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "12344321",
        hmac: false,
        debug: true
    });

    const decryptedData = encryptor.decrypt(encryptedData);
    return decryptedData;
}
module.exports = { encryptData, decryptData };