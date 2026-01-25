"use client";

import React, { useState } from 'react';

export default function TokenCreatorPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    supply: '',
    type: 'ERC20',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const deployToken = async () => {
    console.log("Deploying Token:", formData);
    // Simulate deployment delay
    setTimeout(() => alert("Token Deployed Successfully!"), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Create Your Token</h1>
      
      {/* Progress Bar */}
      <div className="flex mb-8 items-center">
        <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`h-2 flex-1 rounded-full ml-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`h-2 flex-1 rounded-full ml-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Step 1: Basic Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token Name</label>
            <input 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. StrataCoin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token Symbol</label>
            <input 
              name="symbol" 
              value={formData.symbol} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. STRAT"
            />
          </div>
          <button onClick={nextStep} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Next</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Step 2: Supply & Type</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Supply</label>
            <input 
              name="supply" 
              type="number" 
              value={formData.supply} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="1,000,000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token Standard</label>
            <select 
              name="type" 
              value={formData.type} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ERC20">ERC-20 (Standard)</option>
              <option value="ERC721">ERC-721 (NFT)</option>
            </select>
          </div>
          <div className="flex gap-4">
            <button onClick={prevStep} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition">Back</button>
            <button onClick={nextStep} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Review</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Step 3: Review & Deploy</h2>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p><span className="font-medium">Name:</span> {formData.name}</p>
            <p><span className="font-medium">Symbol:</span> {formData.symbol}</p>
            <p><span className="font-medium">Supply:</span> {formData.supply}</p>
            <p><span className="font-medium">Type:</span> {formData.type}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={prevStep} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition">Back</button>
            <button onClick={deployToken} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">Deploy Token</button>
          </div>
        </div>
      )}
    </div>
  );
}
