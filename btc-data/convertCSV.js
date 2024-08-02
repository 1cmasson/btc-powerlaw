const csv = require('csvtojson');
const fs = require('fs');

// Path to the CSV file
const csvFilePath = 'BTC-USD.csv';

const removeFieldsFromJson = (jsonArray, fields) => {
    return jsonArray.map(obj => {
        fields.forEach(field => delete obj[field]);
        return obj;
    });
}

// Function to convert CSV to JSON
csv()
    .fromFile(csvFilePath)
    .then((jsonObj) => {
        const fields = ["Open","High","Low","Adj Close","Volume"]
        const filteredArray = removeFieldsFromJson(jsonObj, fields)
        
        // Convert JSON array to string 
        const jsonArray = JSON.stringify(filteredArray, null, 2);
        // Write JSON string to a file
        fs.writeFile('BTC-USD.json', jsonArray, (err) => {
            if (err) throw err;
            console.log('CSV file has been successfully converted to JSON');
        });
    })
    .catch((err) => {
        console.error('Error converting CSV to JSON:', err);
    });