'use client';

interface ParallaxScoreProps {
  scores: number[];
}

export default function ParallaxScore({ scores }: ParallaxScoreProps) {
  const validScores = scores.filter(s => s > 0);
  const average = validScores.length > 0
    ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
    : 0;

  const getColor = (score: number) => {
    if (score >= 7) return 'text-green-400';
    if (score >= 4) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBgColor = (score: number) => {
    if (score >= 7) return 'from-green-500/20 to-green-600/10';
    if (score >= 4) return 'from-yellow-500/20 to-yellow-600/10';
    return 'from-red-500/20 to-red-600/10';
  };

  if (validScores.length === 0) return null;

  return (
    <div className="text-center mb-8">
      <div className={`inline-block px-8 py-6 rounded-2xl bg-gradient-to-b ${getBgColor(average)} border border-[#333]`}>
        <div className="text-sm text-[#666] mb-1">Parallax Score</div>
        <div className={`text-6xl font-bold ${getColor(average)}`}>
          {average}
          <span className="text-2xl text-[#666]">/10</span>
        </div>
        <div className="text-sm text-[#666] mt-2">
          Based on {validScores.length} persona{validScores.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
