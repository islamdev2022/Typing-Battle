"use client"
import React, { useEffect, useState } from 'react';
import { Medal, Trophy, Crown, Award } from 'lucide-react';

const LeaderboardTable = () => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Revised scoring algorithm that heavily penalizes errors and low accuracy
  const calculateOverallScore = (score) => {
    // Base score starts with WPM
    let baseScore = score.wpm;
    
    // Multiply by accuracy percentage (0-1) to heavily penalize low accuracy
    // This means 50% accuracy would halve the score, 20% accuracy would reduce it to 1/5
    baseScore *= (score.accuracy / 100);
    
    // Apply error penalty
    // Each error reduces score by 5%
    const errorPenalty = Math.max(0, 1 - (score.errors * 0.05));
    baseScore *= errorPenalty;
    
    // If accuracy is below 50% or errors are above 20, 
    // the score is severely reduced to prevent gaming the system
    if (score.accuracy < 50 || score.errors > 20) {
      baseScore *= 0.1;
    }
    
    // Round to 1 decimal place
    return Math.round(baseScore * 10) / 10;
  };

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await fetch('/api/typing-stats');
        if (!response.ok) throw new Error('Failed to fetch scores');
        const data = await response.json();
        
        // Add overall score to each entry and sort by it
        const scoredData = data.map(score => ({
          ...score,
          overallScore: calculateOverallScore(score)
        }));
        
        const sortedScores = scoredData.sort((a, b) => b.overallScore - a.overallScore);
        setScores(sortedScores);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-lg text-gray-300">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-lg text-red-500">Error loading leaderboard: {error}</div>
      </div>
    );
  }

  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <Trophy className="w-6 h-6 text-gray-600" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        Typing Speed Leaderboard 🏆
      </h2>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="p-4">Rank</th>
              <th className="p-4">Player</th>
              <th className="p-4">WPM</th>
              <th className="p-4">Accuracy</th>
              <th className="p-4">Errors</th>
              <th className="p-4">Time Updated</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, index) => (
              <tr 
                key={score._id} 
                className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors text-center"
              >
                <td className="p-4">
                  <div className="flex justify-center items-center">
                    {getRankIcon(index)}
                  </div>
                </td>
                <td className="p-4 font-medium text-gray-200">
                  {score.playerId}
                </td>
                <td className="p-4 text-green-400 font-bold">
                  {score.wpm}
                </td>
                <td className="p-4 text-blue-400">
                  {score.accuracy}%
                </td>
                <td className="p-4 text-red-400">
                  {score.errors}
                </td>
                <td className="p-4 text-gray-400">
                  {new Date(score.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardTable;