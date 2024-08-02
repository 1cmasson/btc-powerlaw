import React from 'react';
import LogLogChart from './components/LogLogChart';
const rawData = require('../../btc-data/BTC-USD.json');

const testData = rawData.map((obj) => ({
  date: new Date(obj.Date), 
  price: Math.floor(parseFloat(obj.Close) * 100)/100
}))

const App = () => {
    return (
        <div className="App">
            <h1>Bitcoin Power Law Chart</h1>
            <LogLogChart data={testData} />
        </div>
    );
};

export default App;
