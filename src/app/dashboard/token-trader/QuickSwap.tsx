'use client';
import React, { useState } from 'react';

const QuickSwap = () => {
  const [sellToken, setSellToken] = useState('ETH');
  const [buyToken, setBuyToken] = useState('STRAT');
  const [amount, setAmount] = useState('');

  return (
    <div className="bg-white/[0.02] backdrop-blur-md rounded-2xl border border-white/10 p-6">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Quick Swap
      </h3>

      <div className="space-y-4">
        {/* Sell Section */}
        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400 text-xs uppercase font-medium">Sell</span>
            <span className="text-gray-500 text-xs">Balance: 1.45 {sellToken}</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="bg-transparent text-2xl text-white outline-none flex-1 font-semibold"
            />
            <select
              value={sellToken}
              onChange={(e) => setSellToken(e.target.value)}
              className="bg-purple-600/20 text-purple-200 border border-purple-500/30 rounded-lg px-2 py-1 outline-none text-sm font-bold"
            >
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>

        {/* Swap Icon */}
        <div className="flex justify-center -my-6 relative z-10">
          <div className="bg-[#1A0D23] border border-white/10 p-2 rounded-full shadow-lg">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        {/* Buy Section */}
        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400 text-xs uppercase font-medium">Buy</span>
            <span className="text-gray-500 text-xs">Balance: 0.00 {buyToken}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl text-white outline-none flex-1 font-semibold opacity-50">
              {amount ? (parseFloat(amount) * 1250).toFixed(2) : '0.0'}
            </div>
            <select
              value={buyToken}
              onChange={(e) => setBuyToken(e.target.value)}
              className="bg-blue-600/20 text-blue-200 border border-blue-500/30 rounded-lg px-2 py-1 outline-none text-sm font-bold"
            >
              <option value="STRAT">STRAT</option>
              <option value="vSTRAT">vSTRAT</option>
            </select>
          </div>
        </div>

        <button className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] mt-4">
          Swap Tokens
        </button>

        <div className="text-center">
          <p className="text-gray-500 text-xs">1 {sellToken} = 1,250 {buyToken}</p>
        </div>
      </div>
    </div>
  );
};

export default QuickSwap;
