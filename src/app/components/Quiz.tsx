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
import { FaAppleAlt, FaCarrot, FaRecycle, FaWeightHanging } from 'react-icons/fa';
import { GiSlicedBread, GiWheat, GiFruitBowl, GiCook } from 'react-icons/gi';
import { MdRestaurant, MdKitchen } from 'react-icons/md';

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
  const [isSubmitting, setIsSubmitting] = useState(false); // Animation pour les boutons

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
    setIsSubmitting(true);
    
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
          // Optional: Handle no answer selected case
      }
    }

    // Only proceed if an answer was provided or handled (for numeric)
    if (answerProvided) {
      setInputValue(''); // Reset input for the next question
      
      setTimeout(() => {
        if (isLastQuestion) {
          setShowRecap(true);
        } else {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
        setIsSubmitting(false);
      }, 200);
    } else {
        // Optionally, show an alert if trying to proceed without answering MC
        alert("Veuillez sélectionner une réponse.");
        setIsSubmitting(false);
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
  };

  // --- Ajout d'un hook pour l'animation d'entrée ---
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    // Animation d'entrée pour le contenu
    setIsVisible(true);
  }, []);

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
      labels: ['Anti-Gaspi (%)', 'Gaspillage (%)'],
      datasets: [
        {
          data: chartDataValues, 
          backgroundColor: ['#f59e0b', '#ef4444'], // Ambre pour bon score, rouge pour gaspillage
          hoverBackgroundColor: ['#fbbf24', '#f87171'],
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
            padding: 25,
            boxWidth: 15,
            font: {
              size: 14,
              family: "'Poppins', sans-serif"
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
            family: "'Poppins', sans-serif"
          },
          bodyFont: {
            size: 14,
            family: "'Poppins', sans-serif"
          },
          cornerRadius: 8,
          displayColors: false,
        }
      }
    };

    let feedbackMessage = '';
    const roundedPercentage = Math.round(scorePercentage);
    if (roundedPercentage >= 80) {
        feedbackMessage = "Félicitations ! Vous êtes un champion de l'anti-gaspillage alimentaire. Vos habitudes préservent les ressources et la planète ! 🥗";
    } else if (roundedPercentage >= 50) {
        feedbackMessage = "Pas mal ! Vous avez de bonnes pratiques mais quelques ajustements peuvent encore réduire votre gaspillage alimentaire. 🍎";
    } else {
        feedbackMessage = "Il y a de la marge de progression ! De petits changements dans vos habitudes peuvent faire une grande différence. 🥕";
    }

    // Determine background based on score
    let bgColorClass = 'from-orange-50 to-amber-100'; // Default
    if (roundedPercentage >= 80) {
      bgColorClass = 'from-amber-50 to-yellow-100';
    } else if (roundedPercentage >= 50) {
      bgColorClass = 'from-orange-50 to-amber-100';
    } else {
      bgColorClass = 'from-red-50 to-orange-100';
    }

    // Détermine l'icône et sa couleur basée sur le score
    let FoodIcon = FaCarrot;
    let iconColor = "text-amber-600";
    
    if (roundedPercentage >= 80) {
      FoodIcon = GiFruitBowl;
      iconColor = "text-amber-600";
    } else if (roundedPercentage >= 50) {
      FoodIcon = FaCarrot;
      iconColor = "text-orange-600";
    } else {
      FoodIcon = GiSlicedBread;
      iconColor = "text-red-500";
    }

    // Calcul de l'équivalent en gaspillage
    // Moyenne française: 30kg/personne/an
    const wasteEquivalent = Math.round((100 - roundedPercentage) * 30 / 100);
    // Économies potentielles: différence avec gaspillage moyen
    const potentialSavings = Math.max(0, 30 - wasteEquivalent);

    // Classes pour l'animation d'entrée
    const animationClass = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4';

    return (
      // Main container with dynamic gradient background
      <div className={`max-w-2xl mx-auto p-6 sm:p-8 bg-gradient-to-br ${bgColorClass} rounded-2xl shadow-xl text-center transition-all duration-700 ease-out relative overflow-hidden ${animationClass}`}>
        {/* Éléments décoratifs en arrière-plan */}
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-amber-100 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute -top-12 -right-12 w-52 h-52 bg-orange-100 rounded-full opacity-20 blur-xl"></div>
        
        {/* Petits éléments décoratifs */}
        <div className="absolute top-6 left-6 text-amber-600 opacity-20">
          <FaAppleAlt size={30} className="animate-bounce" style={{animationDuration: '3s', animationDelay: '0.8s'}} />
        </div>
        <div className="absolute bottom-6 right-6 text-orange-600 opacity-20">
          <GiSlicedBread size={20} className="animate-bounce" style={{animationDuration: '3.5s', animationDelay: '1.5s'}} />
        </div>
        <div className="absolute top-1/3 right-8 text-yellow-600 opacity-20">
          <GiWheat size={25} className="animate-bounce" style={{animationDuration: '4s', animationDelay: '2.2s'}} />
        </div>
        
        <div className="flex items-center justify-center mb-6">
          <FoodIcon className={`${iconColor} text-4xl mr-3`} />
          <h2 className="text-3xl sm:text-4xl font-bold text-amber-800 font-eco">Votre Bilan Anti-Gaspi</h2>
          <FoodIcon className={`${iconColor} text-4xl ml-3 transform scale-x-[-1]`} />
        </div>
        
        {/* Chart and Score Section - CORRECTION DU PROBLÈME DE CENTRAGE */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-6 mb-8 border border-amber-100">
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto mb-6">
            <Doughnut data={chartData} options={chartOptions} />
            {/* Nouvelle implémentation pour centrer parfaitement le texte */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-5xl sm:text-6xl font-bold text-amber-600">{roundedPercentage}%</span>
                <span className="text-sm sm:text-base text-gray-600 block mt-1">Score anti-gaspi</span>
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

        {/* Impact et Feedback Message Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-6 mb-8 border border-amber-100">
          <p className="text-lg sm:text-xl text-amber-700 italic leading-relaxed mb-4">{feedbackMessage}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 transition-all hover:shadow-md duration-300">
              <div className="flex items-center justify-center">
                <FaWeightHanging className="text-amber-600 mr-2" />
                <h4 className="text-amber-800 font-medium">Estimation annuelle</h4>
              </div>
              <p className="text-xl font-bold text-amber-700 mt-2">{wasteEquivalent} kg</p>
              <p className="text-xs text-amber-600 mt-1">de nourriture gaspillée par an</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 transition-all hover:shadow-md duration-300">
              <div className="flex items-center justify-center">
                <FaRecycle className="text-green-600 mr-2" />
                <h4 className="text-green-800 font-medium">Économies potentielles</h4>
              </div>
              <p className="text-xl font-bold text-green-700 mt-2">{potentialSavings} kg</p>
              <p className="text-xs text-green-600 mt-1">par rapport à la moyenne nationale</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200 transition-all hover:shadow-md duration-300">
            <h4 className="text-amber-800 font-medium mb-2 flex items-center justify-center">
              <GiCook className="mr-2 text-orange-600" /> Astuce anti-gaspi
            </h4>
            <p className="text-sm text-amber-700">
              {roundedPercentage >= 80 
                ? "Partagez vos restes alimentaires avec des applications comme 'Too Good To Go' ou dans votre communauté locale !"
                : roundedPercentage >= 50 
                  ? "Planifiez vos repas à l'avance et n'achetez que ce dont vous avez besoin. Cela réduit les achats impulsifs et le gaspillage."
                  : "Apprenez à conserver correctement vos aliments et à comprendre la différence entre 'à consommer de préférence avant' et 'à consommer jusqu'au'."
              }
            </p>
          </div>
        </div>

        {/* Detailed Answers Section - Amélioré avec animation */}
        <details className="text-left mb-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-amber-100 cursor-pointer overflow-hidden group">
            <summary className="font-semibold text-amber-700 hover:text-amber-900 p-4 flex justify-between items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 transition-colors duration-300">
              <span>Détail de mes réponses</span>
              <svg className="w-5 h-5 text-amber-500 transform transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </summary>
            <ul className="mt-0 p-4 border-t border-amber-100 space-y-3 transition-all duration-500 ease-in-out">
                {typedQuizData.questions.map((q, index) => (
                    <li key={q.id} className="text-sm border-b border-amber-100 pb-3 last:border-b-0 hover:bg-amber-50/50 p-2 rounded transition-colors duration-200">
                       <div className="flex justify-between items-start gap-2">
                           <span className="font-medium text-amber-800 flex-1">{index + 1}. {q.question}</span> 
                           <span className="text-xs text-amber-600 whitespace-nowrap pt-0.5">(Score: {answers[index]?.score ?? '-'})</span>
                       </div>
                       <span className="block text-orange-600 font-medium ml-1 mt-1">→ {answers[index]?.answer || 'Non répondu'}</span> 
                    </li>
                ))}
            </ul>
        </details>
        
        <button
          onClick={handleRestart}
          className="w-full px-6 py-4 text-lg font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Recommencer le questionnaire
        </button>
      </div>
    );
  }

  // --- Quiz Screen --- 
  // Classes pour l'animation d'entrée
  const animationClass = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4';

  return (
    <div className={`max-w-2xl mx-auto p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-xl border border-amber-100 relative transition-all duration-500 ${animationClass}`}>
      {/* Éléments décoratifs */}
      <div className="absolute top-4 right-4 text-amber-600 opacity-20">
        <FaAppleAlt size={40} className="animate-bounce" style={{animationDuration: '3s'}} />
      </div>
      
      {/* Barre de progression améliorée */}
      <div className="w-full bg-amber-100 rounded-full h-2.5 mb-8 overflow-hidden">
        <div 
          className="bg-amber-600 h-2.5 rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${((currentQuestionIndex + 1) / typedQuizData.questions.length) * 100}%` }}
        >
          <div className="absolute inset-0 bg-white/30 w-full h-full animate-pulse"></div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-amber-800">
            Question {currentQuestionIndex + 1}/{typedQuizData.questions.length}
          </h2>
          <span className="text-sm text-amber-500 font-medium bg-amber-50 px-3 py-1 rounded-full">
            {Math.round(((currentQuestionIndex + 1) / typedQuizData.questions.length) * 100)}%
          </span>
        </div>
        
        <p className="text-xl mb-8 text-amber-700 leading-relaxed">
          {currentQuestion.question}
        </p>
        
        {currentQuestion.type === 'numeric' ? (
          <div className="space-y-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 transition-colors text-black shadow-sm hover:shadow-md focus:shadow-md"
              placeholder={`Entrez une valeur ${currentQuestion.unit ? `(en ${currentQuestion.unit})` : ''}... Ou "Je ne sais pas" si applicable.`}
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
                    ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-300 transform scale-[1.01]'
                    : 'bg-white text-green-800 hover:bg-green-50 shadow-sm border border-green-200 hover:shadow-md'
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
            className="px-6 py-3 text-lg font-medium text-green-700 bg-white rounded-lg hover:bg-green-50 transition-all duration-200 shadow-sm border border-green-200 hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Précédent
          </button>
        ) : (<div className="w-32"></div>)}
        
        <button
          onClick={handleNextQuestion}
          disabled={currentQuestion.type === 'multiple_choice' && !answers[currentQuestionIndex] || isSubmitting}
          className={`px-6 py-3 text-lg font-medium text-white rounded-lg transition-all duration-200 shadow-sm ${
            isLastQuestion
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-teal-500 hover:bg-teal-600'
          } ${
            (currentQuestion.type === 'multiple_choice' && !answers[currentQuestionIndex]) || isSubmitting 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isLastQuestion ? 'Analyse des résultats...' : 'Enregistrement...'}
            </span>
          ) : (
            isLastQuestion ? 'Voir mes résultats' : 'Suivant'
          )}
        </button>
      </div>
    </div>
  );
}