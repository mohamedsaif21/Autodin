'use client';
import { useState, useEffect, useCallback } from 'react';

interface ScheduledPost {
  id: string;
  title: string;
  date: string;
  time: string;
  posterPath: string;
  liveStatus: 'today' | 'pending' | 'posted' | 'expired';
  postedAt: string | null;
  linkedinPostId: string | null;
}

interface GeneratedCaption {
  postId: string;
  posterPath: string;
  title: string;
  extractedText: string;
  occasion: string;
  caption: string;
}

type ModalStep = 'idle' | 'extracting' | 'review' | 'posting' | 'done';

const STATUS_STYLES = {
  today:   { bg: '#071a10', border: '#0d4a20', dot: '#22c55e', label: 'Post Today',  labelColor: '#22c55e' },
  pending: { bg: '#0a0a18', border: '#1a1a30', dot: '#4f46e5', label: 'Scheduled',   labelColor: '#4f46e5' },
  posted:  { bg: '#071016', border: '#0d3040', dot: '#38bdf8', label: 'Posted',      labelColor: '#38bdf8' },
  expired: { bg: '#180808', border: '#3a1010', dot: '#555',    label: 'Expired',     labelColor: '#555'    },
};

export default function ScheduledMode() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [todayPost, setTodayPost] = useState<ScheduledPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [activePost, setActivePost] = useState<ScheduledPost | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>('idle');
  const [generated, setGenerated] = useState<GeneratedCaption | null>(null);
  const [modalError, setModalError] = useState('');

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduled');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPosts(data.posts);
      setTodayPost(data.todayPost);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  // Auto-check on mount
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Open modal for a post
  async function openPost(post: ScheduledPost) {
    setActivePost(post);
    setModalStep('extracting');
    setModalError('');
    setGenerated(null);

    try {
      const res = await fetch('/api/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setGenerated(data);
      setModalStep('review');
    } catch (e: any) {
      setModalError(e.message);
      setModalStep('review');
    }
  }

  // Post to LinkedIn
  async function handlePost() {
    if (!activePost || !generated) return;
    setModalStep('posting');
    setModalError('');

    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: activePost.posterPath,
          caption: generated.caption,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || JSON.stringify(data.details));