"use client";

import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import Link from 'next/link';

interface Campaign {
  id: string;
  title: string;
  status: 'active' | 'scheduled' | 'ended';
  participants: number;
  rewardPool: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock fetch
    setTimeout(() => {
      setCampaigns([
        { id: '1', title: 'Early Adopter Airdrop', status: 'active', participants: 1250, rewardPool: '50,000 STRAT' },
        { id: '2', title: 'Liquidity Mining S1', status: 'scheduled', participants: 0, rewardPool: '100,000 STRAT' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campaigns</h1>
          <p className="text-gray-500">Manage your marketing and reward campaigns.</p>
        </div>
        <Link href="/dashboard/campaigns/create">
          <Button>+ New Campaign</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading campaigns...</div>
      ) : campaigns.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">No campaigns found.</p>
          <Link href="/dashboard/campaigns/create">
            <Button variant="outline">Create One Now</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    ended: 'bg-gray-100 text-gray-700',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg text-gray-800">{campaign.title}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[campaign.status]}`}>
          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
        </span>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Participants</span>
          <span className="font-medium text-gray-900">{campaign.participants.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Reward Pool</span>
          <span className="font-medium text-gray-900">{campaign.rewardPool}</span>
        </div>
      </div>
      <div className="mt-6">
        <Button variant="outline" className="w-full text-sm">Manage</Button>
      </div>
    </Card>
  );
}
