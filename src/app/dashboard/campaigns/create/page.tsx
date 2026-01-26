"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

export default function CreateCampaignPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rewardAmount: '',
    startDate: '',
    endDate: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating campaign:', formData);
    // Simulate API call
    setTimeout(() => {
      router.push('/dashboard/campaigns');
    }, 1000);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <button 
          onClick={() => router.back()} 
          className="text-gray-500 hover:text-blue-600 mb-2 flex items-center gap-1"
        >
          ← Back to Campaigns
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Create New Campaign</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input 
              label="Campaign Title" 
              name="title" 
              placeholder="e.g. Summer Airdrop Fiesta"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              name="description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Describe the goals and rules of this campaign..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Reward Amount" 
              name="rewardAmount" 
              type="number" 
              placeholder="0.00"
              value={formData.rewardAmount}
              onChange={handleChange}
            />
            <div className="flex items-center mt-6 text-gray-500">
              Tokens will be deducted from your connected wallet.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Start Date" 
              name="startDate" 
              type="date" 
              value={formData.startDate}
              onChange={handleChange}
            />
            <Input 
              label="End Date" 
              name="endDate" 
              type="date" 
              value={formData.endDate}
              onChange={handleChange}
            />
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit">Launch Campaign</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
