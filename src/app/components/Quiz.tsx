'use client';

import { useState, useEffect } from 'react';
import quizData from '../../data/quiz.json';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { FaLeaf } from 'react-icons/fa';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Option {
  text: string;
  score: number;
}

interface ScoringRange {
  max?: number;
  min?: number;
  value?: string;
  score?: number;
  defaultScore?: number; 
}

interface Question {
  id: number;
  question: string;
  type: string;
  options?: Option[];
  scoringRanges?: ScoringRange[];
  unit?: string;
}

const typedQuizData: { questions: Question[] } = quizData;

// Helper function to calculate score for numeric answers
function calculateNumericScore(value: string, ranges: ScoringRange[]): number {
  const numericValue = parseFloat(value.replace(',', '.'));

  if (isNaN(numericValue)) {
    // Handle non-numeric input like "Je ne sais pas"
    const specificValueRange = ranges.find(range => range.value?.toLowerCase() === value.toLowerCase());
    if (specificValueRange) {
      return specificValueRange.score;
    }
    // Try to find a default score if input is not a number and not explicitly handled
    const defaultRange = ranges.find(range => range.defaultScore !== undefined);
    return defaultRange?.defaultScore ?? ranges[ranges.length - 1].score; // Default to highest score if no specific default
  }

  for (const range of ranges) {
    if (range.max !== undefined && range.min !== undefined) {
      if (numericValue >= range.min && numericValue <= range.max) {
        return range.score;
      }
    } else if (range.max !== undefined) {
      if (numericValue <= range.max) {
        return range.score;
      }
    } else if (range.min !== undefined) { // Should be evaluated after max for ranges like >= 400g
       if (numericValue >= range.min) {
        return range.score;
      }
    }
  }

  // Find default score if no range matches
  const defaultRange = ranges.find(range => range.defaultScore !== undefined);
  return defaultRange?.defaultScore ?? ranges[ranges.length - 1].score; // Default to highest score if no range applies
}

export default function Quiz() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [answers, setAnswers] = useState<Record<number, { answer: string; score: number }>>({});
  const [totalScore, setTotalScore] = useState(0);
  const [showRecap, setShowRecap] = useState(false);
  const [minPossibleScore, setMinPossibleScore] = useState(0);
  const [maxPossibleScore, setMaxPossibleScore] = useState(0);
  const [weeklyBudget, setWeeklyBudget] = useState<number | null>(null);
  const [weeklyWaste, setWeeklyWaste] = useState<number | null>(null);

  const currentQuestion = typedQuizData.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === typedQuizData.questions.length - 1;

  useEffect(() => {
    // Recalculate total score whenever answers change
    const score = Object.values(answers).reduce((sum, current) => sum + (current?.score ?? 0), 0);
    setTotalScore(score);
  }, [answers]);

  // Calculate Min/Max scores once when component mounts or quizData changes
  useEffect(() => {
    const { minScore, maxScore } = typedQuizData.questions.reduce(
        (acc, q) => {
            let qMin = Infinity;
            let qMax = -Infinity;

            if (q.type === 'multiple_choice' && q.options && q.options.length > 0) {
                const scores = q.options.map(opt => opt.score).filter(s => typeof s === 'number' && isFinite(s));
                if (scores.length > 0) {
                  qMin = Math.min(...scores);
                  qMax = Math.max(...scores);
                }
            } else if (q.type === 'numeric' && q.scoringRanges && q.scoringRanges.length > 0) {
                const scores = q.scoringRanges.map(r => r.score).filter(s => typeof s === 'number' && isFinite(s));
                const defaultScoreObj = q.scoringRanges.find(r => r.defaultScore !== undefined);
                if (defaultScoreObj && typeof defaultScoreObj.defaultScore === 'number' && isFinite(defaultScoreObj.defaultScore)) {
                    scores.push(defaultScoreObj.defaultScore);
                }
                if (scores.length > 0) {
                  qMin = Math.min(...scores);
                  qMax = Math.max(...scores);
                }
            }
           
            acc.minScore += isFinite(qMin) ? qMin : 0; 
            acc.maxScore += isFinite(qMax) ? qMax : 0; 

            return acc;
        },
        { minScore: 0, maxScore: 0 }
    );
    setMinPossibleScore(minScore);
    setMaxPossibleScore(maxScore);
  }, []); // Run only once on mount

  const handleAnswer = (option: Option) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: { answer: option.text, score: option.score }
    }));
  };

  const handleNextQuestion = () => {
    let currentScore = 0;
    let currentAnswer = '';
    let answerProvided = false;

    if (currentQuestion.type === 'numeric') {
      if (inputValue.trim() !== '') {
        currentScore = calculateNumericScore(inputValue, currentQuestion.scoringRanges || []);
        currentAnswer = inputValue;
        answerProvided = true;
      } else {
        // Assign default score if input is empty
        const defaultRange = currentQuestion.scoringRanges?.find(r => r.defaultScore !== undefined);
        currentScore = defaultRange?.defaultScore ?? (currentQuestion.scoringRanges && currentQuestion.scoringRanges.length > 0 ? Math.max(...currentQuestion.scoringRanges.map(r => r.score).filter(isFinite)) : 4); // Default to high score (e.g., 4)
        currentAnswer = ''; // Non répondu
      }
      setAnswers(prev => ({
        ...prev,
        [currentQuestionIndex]: { answer: currentAnswer, score: currentScore }
      }));
      answerProvided = true; // Mark as handled even if empty
    }

    // For multiple choice, the answer should already be in the state via handleAnswer
    if (currentQuestion.type === 'multiple_choice') {
      if (answers[currentQuestionIndex]) {
          answerProvided = true;
      } else {
          // Optional: Assign highest score if no answer selected for MC
          // const maxScoreOption = currentQuestion.options?.reduce((max, opt) => opt.score > max.score ? opt : max, currentQuestion.options[0]);
          // currentScore = maxScoreOption?.score ?? 4; // Default to high score
          // currentAnswer = ''; // Non répondu
          // setAnswers(prev => ({
          //     ...prev,
          //     [currentQuestionIndex]: { answer: currentAnswer, score: currentScore }
          // }));
          // answerProvided = true; 
          // OR simply prevent moving next (handled by disabled state of button)
      }
    }

    if (currentQuestion.id === 21) {
      // Budget question
      setWeeklyBudget(parseFloat(inputValue) || 0);
    } else if (currentQuestion.id === 22) {
      // Waste question
      setWeeklyWaste(parseFloat(inputValue) || 0);
    }

    // Only proceed if an answer was provided or handled (for numeric)
    if (answerProvided) {
      setInputValue(''); // Reset input for the next question
      if (isLastQuestion) {
        setShowRecap(true);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } else {
        // Optionally, show an alert if trying to proceed without answering MC
        alert("Veuillez sélectionner une réponse.");
    }
  };

  const handlePrevious = () => {
     if (currentQuestionIndex > 0) {
         const previousAnswerData = answers[currentQuestionIndex - 1];
         const previousQuestion = typedQuizData.questions[currentQuestionIndex-1];
         if (previousQuestion.type === 'numeric' && previousAnswerData) {
             setInputValue(previousAnswerData.answer || '');
         } else {
             setInputValue(''); 
         }
        setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setInputValue('');
    setAnswers({});
    setTotalScore(0);
    setShowRecap(false);
    setWeeklyBudget(null);
    setWeeklyWaste(null);
  };

  // --- Recap Screen --- 
  if (showRecap) {
    // Calculate percentage safely
    let scorePercentage = 0; // Default to 0 
    const range = maxPossibleScore - minPossibleScore;

    if (range > 0 && isFinite(totalScore) && isFinite(minPossibleScore) && isFinite(maxPossibleScore)) {
        // Invert score: higher raw score is worse, so better percentage = lower raw score
        scorePercentage = ((maxPossibleScore - totalScore) / range) * 100;
        // Clamp percentage between 0 and 100
        scorePercentage = Math.max(0, Math.min(100, scorePercentage)); 
    } else if (range === 0 && totalScore === minPossibleScore) {
        // Handle case where min and max are the same
        scorePercentage = 100; // Perfect score if achieved
    } else {
        console.error("Error calculating score percentage. Check min/max/total scores:", {minPossibleScore, maxPossibleScore, totalScore});
        // Keep scorePercentage at 0 or set to a specific error indicator if needed
    }

    // Prepare chart data safely
    let chartDataValues = [50, 50]; // Default chart (e.g., 50/50)
    if (range > 0 && isFinite(totalScore) && isFinite(minPossibleScore) && isFinite(maxPossibleScore)) {
         // Represents the "good" part of the score range achieved (closer to min)
         const goodPart = maxPossibleScore - totalScore; 
         // Represents the "bad" part (deviation from min)
         const badPart = totalScore - minPossibleScore; 

         chartDataValues[0] = Math.max(0, goodPart);
         chartDataValues[1] = Math.max(0, badPart); 
         
         // Ensure sum is not zero if both are zero (avoid empty chart)
         if(chartDataValues[0] === 0 && chartDataValues[1] === 0 && range > 0) {
             chartDataValues = [0, 100]; // Show full bad part if score equals max score
             if (totalScore === minPossibleScore) chartDataValues = [100, 0]; // Show full good part if score equals min score
         }

    } else if (range === 0) {
         chartDataValues = [100, 0]; // Full good part if min=max
    }

    const chartData = {
      labels: ['Votre Score (%)', 'Marge de Progression (%)'],
      datasets: [
        {
          data: chartDataValues, 
          backgroundColor: ['#4CAF50', '#FFC107'], // Vert plus naturel, Jaune ambré
          hoverBackgroundColor: ['#66BB6A', '#FFD54F'],
          borderColor: '#ffffff',
          borderWidth: 3, 
          hoverOffset: 4
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom' as const,
          labels: {
            padding: 25, // Increased padding
            boxWidth: 15,
            font: {
              size: 14,
              family: "'Inter', sans-serif"
            },
            color: '#4B5563'
          }
        },
        tooltip: {
          enabled: true,
          padding: 12,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: {
            size: 16,
            weight: 'bold' as const,
            family: "'Inter', sans-serif"
          },
          bodyFont: {
            size: 14,
            family: "'Inter', sans-serif"
          },
          cornerRadius: 8,
          displayColors: false,
        }
      }
    };

    let feedbackMessage = '';
    const roundedPercentage = Math.round(scorePercentage);
    if (roundedPercentage >= 80) {
        feedbackMessage = "Excellent ! Vos habitudes sont exemplaires. Continuez sur cette voie ! 🌱";
    } else if (roundedPercentage >= 50) {
        feedbackMessage = "Pas mal ! Vous êtes sur la bonne voie, mais quelques gestes peuvent encore faire la différence. 🌍";
    } else {
        feedbackMessage = "Il y a du potentiel ! Chaque effort compte pour un avenir plus durable. 💪";
    }

    // Determine background based on score
    let bgColorClass = 'from-blue-50 to-teal-100'; // Default
    if (roundedPercentage >= 80) {
      bgColorClass = 'from-green-100 to-emerald-200';
    } else if (roundedPercentage >= 50) {
      bgColorClass = 'from-yellow-50 to-amber-100';
    } else {
      bgColorClass = 'from-orange-50 to-rose-100';
    }

    // Calculate annual food waste cost
    const annualWasteCost = (weeklyWaste || 0) * 52;

    return (
      // Main container with dynamic gradient background
      <div className={`max-w-2xl mx-auto p-6 sm:p-8 bg-gradient-to-br ${bgColorClass} rounded-2xl shadow-xl text-center transition-colors duration-500`}>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-8">Votre Bilan Écologique</h2>
        
        {/* Chart and Score Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 mb-8">
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto mb-6">
            <Doughnut data={chartData} options={chartOptions} />
            <div className="absolute inset-0 flex items-center justify-center flex-col text-center">
              <div className="flex flex-col items-center justify-center transform -translate-y-1">
                <span className="text-5xl sm:text-6xl font-bold text-green-600">{roundedPercentage}%</span>
                <span className="text-sm sm:text-base text-gray-600 mt-1">Éco-score</span>
              </div>
            </div>
          </div>
          <p className="text-base sm:text-lg text-gray-700">
            Score Total : <span className="font-semibold text-gray-900">{totalScore}</span>
            <span className="text-xs text-gray-500 block sm:inline sm:ml-2">
              (Min: {minPossibleScore} / Max: {maxPossibleScore})
            </span>
          </p>
        </div>

        {/* Feedback Message Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 mb-8">
           <p className="text-lg sm:text-xl text-gray-700 italic leading-relaxed">{feedbackMessage}</p>
        </div>

        {/* New section for annual waste cost */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Estimation du gaspillage annuel</h3>
          <p className="text-base text-gray-700">
            Vous gaspillez environ <span className="font-bold text-red-500">{annualWasteCost.toFixed(2)}€</span> par an en nourriture.
          </p>
        </div>

        {/* Detailed Answers Section */}
        <details className="text-left mb-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 cursor-pointer overflow-hidden">
            <summary className="font-semibold text-gray-700 hover:text-gray-900 p-4 flex justify-between items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
              <span>Détail de mes réponses</span>
              <svg className="w-5 h-5 text-gray-500 transform transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </summary>
            <ul className="mt-0 p-4 border-t border-gray-200/60 space-y-3">
                {typedQuizData.questions.map((q, index) => (
                    <li key={q.id} className="text-sm border-b border-gray-200/60 pb-3 last:border-b-0">
                       <div className="flex justify-between items-start gap-2">
                           <span className="font-medium text-gray-800 flex-1">{index + 1}. {q.question}</span> 
                           <span className="text-xs text-gray-500 whitespace-nowrap pt-0.5">(Score: {answers[index]?.score ?? '-'})</span>
                       </div>
                       <span className="block text-blue-600 font-medium ml-1 mt-1">→ {answers[index]?.answer || 'Non répondu'}</span> 
                    </li>
                ))}
            </ul>
        </details>
        

        <button
          onClick={handleRestart}
          className="w-full px-6 py-4 text-lg font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          Recommencer le questionnaire
        </button>
      </div>
    );
  }

  // --- Quiz Screen --- 
  return (
    <div className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl shadow-xl border border-green-100">
      {/* Ajouter ces éléments décoratifs en haut */}
      <div className="absolute top-4 right-4 text-green-600 opacity-20">
        <FaLeaf size={40} className="floating" style={{animationDelay: '0.5s'}} />
      </div>
      <div className="absolute top-20 left-4 text-green-500 opacity-20">
        <FaLeaf size={30} className="floating" style={{animationDelay: '2s'}} />
      </div>
      
      {/* Barre de progression avec une couleur plus verte */}
      <div className="w-full bg-green-100 rounded-full h-2.5 mb-8">
        <div 
          className="bg-green-600 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentQuestionIndex + 1) / typedQuizData.questions.length) * 100}%` }}
        ></div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Question {currentQuestionIndex + 1}/{typedQuizData.questions.length}
          </h2>
          <span className="text-sm text-gray-500">
            {Math.round(((currentQuestionIndex + 1) / typedQuizData.questions.length) * 100)}%
          </span>
        </div>
        
        <p className="text-xl mb-8 text-gray-700 leading-relaxed">
          {currentQuestion.question}
        </p>
        
        {currentQuestion.type === 'numeric' ? (
          <div className="space-y-4">
            <input
              type="text" // Consider type="number"? Requires more validation maybe.
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-black"
              placeholder={`Entrez une valeur ${currentQuestion.unit ? `(en ${currentQuestion.unit})` : ''}... Ou "Je ne sais pas" si applicable.`} // Update placeholder
            />
          </div>
        ) : (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <button
              key={index}
              onClick={() => handleAnswer(option)}
              className={`w-full px-6 py-4 text-lg font-medium rounded-lg transition-all duration-200 text-left ${
                answers[currentQuestionIndex]?.answer === option.text
                  ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-300'
                  : 'bg-white text-green-800 hover:bg-green-50 shadow-sm border border-green-200'
              }`}
            >
              {option.text}
            </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        {currentQuestionIndex > 0 ? (
          <button
            onClick={handlePrevious}
            className="px-6 py-3 text-lg font-medium text-green-700 bg-white rounded-lg hover:bg-green-50 transition-colors shadow-sm border border-green-200"
          >
            Précédent
          </button>
        ) : ( <div className="w-32"></div>) }
        
        <button
          onClick={handleNextQuestion}
          disabled={currentQuestion.type === 'multiple_choice' && !answers[currentQuestionIndex]}
          className={`px-6 py-3 text-lg font-medium text-white rounded-lg transition-colors shadow-sm ${ 
            isLastQuestion
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-teal-500 hover:bg-teal-600'
          } ${ (currentQuestion.type === 'multiple_choice' && !answers[currentQuestionIndex]) ? 'opacity-50 cursor-not-allowed' : '' }`}
        >
          {isLastQuestion
            ? 'Voir mes résultats'
            : 'Suivant'}
        </button>
      </div>
    </div>
  );
}