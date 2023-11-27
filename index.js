const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const port = 3000; // Choose a port for your API
//Use body-parser middleware to parse JSON requests
app.use(bodyParser.json());

app.get('/checkAddress', async (req, res) => {
    const addressToCheck = req.body.address;
    try {
        const doc = await initializeSpreadsheet();
        const result = await checkAddressInERC20Column(doc, addressToCheck);

        res.json({ success: true, found: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

async function loadCredentials() {
    const credentialsJSON = fs.readFileSync('creds.json');
    return JSON.parse(credentialsJSON);
}

async function initializeSpreadsheet() {
    const { private_key, client_email } = await loadCredentials();
    const authClient = new JWT({
        email: client_email,
        key: private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const spreadsheetId = '1Jjs2nguWg-WOvfwZTSAGTwfjI0dyCW8k2i7ZvsaBf6c';
    return new GoogleSpreadsheet(spreadsheetId, authClient);
}

const checkAddressInERC20Column = async (doc, addressToCheck) => {
    await doc.loadInfo(); // Make sure the spreadsheet info is loaded

    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow(); // Load the header row to get column titles

    const erc20ColumnIndex = sheet.headerValues.indexOf('ERC-20');

    if (erc20ColumnIndex !== -1) {
        // Column found, now check each row in the ERC-20 column
        const rows = await sheet.getRows();
        for (const row of rows) {
            const cellValue = row._rawData[erc20ColumnIndex]; // Assuming 0-based index
            if (cellValue === addressToCheck) {
                console.log(`Address ${addressToCheck} found in ERC-20 column.`);
                return true; // Address found
            }
        }
    } else {
        console.log('ERC-20 column not found in the spreadsheet.');
    }

    console.log(`Address ${addressToCheck} not found in ERC-20 column.`);
    return false; // Address not found
};

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
