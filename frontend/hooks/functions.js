import CryptoJS from 'crypto-js';

function encryptData(data) {

    if (typeof data !== 'string') {
        data = JSON.stringify(data);
    }

    const encryptedData = CryptoJS.AES.encrypt(data, process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "12344321").toString();
    return encryptedData;
}

function decryptData(encryptedData) {
    try {
        // Vérifier si les données sont valides
        if (!encryptedData || typeof encryptedData !== 'string') {
            console.warn('Invalid encrypted data');
            return null;
        }

        const decryptedData = CryptoJS.AES.decrypt(encryptedData, process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "12344321");
        const decryptedString = decryptedData.toString(CryptoJS.enc.Utf8);

        // Vérifier si le déchiffrement a réussi
        if (!decryptedString) {
            console.warn('Decryption failed - empty result');
            return null;
        }

        return decryptedString;
    } catch (error) {
        console.error('Decryption error:', error);
        // Retourner null en cas d'erreur pour éviter le crash
        return null;
    }
}
module.exports = { encryptData, decryptData };