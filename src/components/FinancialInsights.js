import React, { useState, useCallback, useEffect } from 'react';
import {
    Brain,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Lightbulb,
    Settings,
    RefreshCw,
    Copy,
    Download,
    ExternalLink,
    Target,
    DollarSign,
    TrendingDown,
    Shield
} from 'lucide-react';
import { ChatGPTFinancialService } from '../services/ChatGPTFinancialService';
import { FirebaseService } from '../services/FirebaseService';
import { Card, Button, Alert, Input, Badge, LoadingSpinner } from './UI';

/**
 * Enhanced text formatting function specifically for financial insights
 */
const formatInsightsContent = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let inOrderedList = false;
    let inUnorderedList = false;

    const flushList = () => {
        if (currentList.length > 0) {
            if (inOrderedList) {
                elements.push(
                    <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-2 mb-4 ml-4">
                        {currentList}
                    </ol>
                );
            } else if (inUnorderedList) {
                elements.push(
                    <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 mb-4 ml-4">
                        {currentList}
                    </ul>
                );
            }
            currentList = [];
            inOrderedList = false;
            inUnorderedList = false;
        }
    };

    const formatInlineText = (text) => {
        // Handle bold text (**text** or **text:**)
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');

        // Handle dollar amounts - make them stand out
        formatted = formatted.replace(/\$[\d,]+(?:\.\d{2})?/g, '<span class="font-semibold text-green-600">$&</span>');

        // Handle percentages
        formatted = formatted.replace(/\d+(?:\.\d+)?%/g, '<span class="font-medium text-blue-600">$&</span>');

        return formatted;
    };

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
            flushList();
            return;
        }

        // Handle main headers (### anything)
        if (trimmedLine.match(/^###\s+/)) {
            flushList();
            const headerText = trimmedLine.replace(/^###\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
            elements.push(
                <h3 key={`h3-${index}`} className="text-lg font-bold text-gray-900 mt-6 mb-3 border-b border-gray-200 pb-2">
                    {headerText}
                </h3>
            );
            return;
        }

        // Handle section headers (**Header** only, not mixed with other content)
        if (trimmedLine.match(/^\*\*([^*]+)\*\*:?\s*$/) && !trimmedLine.includes('Method') && !trimmedLine.includes(':')) {
            flushList();
            const headerText = trimmedLine.replace(/^\*\*(.*?)\*\*:?\s*$/, '$1');
            elements.push(
                <h4 key={`h4-${index}`} className="text-base font-semibold text-gray-800 mt-5 mb-3">
                    {headerText}
                </h4>
            );
            return;
        }

        // Handle numbered list items (1. Item, 2. Item, etc.)
        const numberedMatch = trimmedLine.match(/^(\d+)\.\s*(.+)/);
        if (numberedMatch) {
            if (!inOrderedList) {
                flushList();
                inOrderedList = true;
            }

            const itemText = formatInlineText(numberedMatch[2]);
            currentList.push(
                <li key={`li-${index}`}
                    className="text-gray-700 leading-relaxed mb-2"
                    dangerouslySetInnerHTML={{ __html: itemText }}
                />
            );
            return;
        }

        // Handle unordered list items (- Item, • Item)
        const bulletMatch = trimmedLine.match(/^[-•]\s*(.+)/);
        if (bulletMatch) {
            if (!inUnorderedList) {
                flushList();
                inUnorderedList = true;
            }

            const itemText = formatInlineText(bulletMatch[1]);
            currentList.push(
                <li key={`li-${index}`}
                    className="text-gray-700 leading-relaxed mb-2"
                    dangerouslySetInnerHTML={{ __html: itemText }}
                />
            );
            return;
        }

        // Handle sub-items with additional indentation (-- Item or   - Item)
        const subItemMatch = trimmedLine.match(/^(?:--|  [-•])\s*(.+)/);
        if (subItemMatch && (inOrderedList || inUnorderedList)) {
            const itemText = formatInlineText(subItemMatch[1]);
            currentList.push(
                <li key={`subli-${index}`}
                    className="text-gray-600 leading-relaxed ml-6 list-none relative before:content-['↳'] before:absolute before:-left-4 before:text-gray-400"
                    dangerouslySetInnerHTML={{ __html: itemText }}
                />
            );
            return;
        }

        // Handle score lines (Financial Health Score: 6/10)
        if (trimmedLine.match(/score.*?\d+\/10/i)) {
            flushList();
            const formattedText = formatInlineText(trimmedLine);
            elements.push(
                <div key={`score-${index}`} className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
                    <p className="text-blue-900 font-medium text-lg" dangerouslySetInnerHTML={{ __html: formattedText }} />
                </div>
            );
            return;
        }

        // Handle explanation or regular paragraphs
        if (trimmedLine.length > 0) {
            flushList();
            const formattedText = formatInlineText(trimmedLine);

            // Check if this looks like an explanation or important note
            if (trimmedLine.toLowerCase().includes('explanation:') ||
                trimmedLine.toLowerCase().includes('important:') ||
                trimmedLine.toLowerCase().includes('note:')) {
                elements.push(
                    <div key={`note-${index}`} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-3">
                        <p className="text-yellow-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedText }} />
                    </div>
                );
            } else {
                elements.push(
                    <p key={`p-${index}`}
                       className="text-gray-700 leading-relaxed mb-3"
                       dangerouslySetInnerHTML={{ __html: formattedText }}
                    />
                );
            }
        }
    });

    // Flush any remaining list items
    flushList();

    return <div className="space-y-2">{elements}</div>;
};

/**
 * Enhanced Financial Insights Component
 * Better text formatting and Firebase storage
 */
const FinancialInsights = ({
                               user,
                               paycheckData,
                               expenses,
                               creditCards,
                               taxCalculations,
                               hasApiKey,
                               onNavigateToSettings
                           }) => {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [focusArea, setFocusArea] = useState('');

    /**
     * Load cached insights on component mount
     */
    useEffect(() => {
        if (user?.uid) {
            loadCachedInsights();
        }
    }, [user?.uid]);

    /**
     * Load cached insights from Firebase
     */
    const loadCachedInsights = async () => {
        if (!user?.uid) return;

        try {
            const cachedInsights = await FirebaseService.getUserDocuments(
                'financialInsights',
                user.uid,
                'createdAt',
                'desc',
                1 // Get only the most recent
            );

            if (cachedInsights.length > 0) {
                const cached = cachedInsights[0];
                // Only use cached insights if they're less than 7 days old
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);

                if (new Date(cached.createdAt) > weekAgo) {
                    setInsights(cached);
                }
            }
        } catch (error) {
            console.error('Error loading cached insights:', error);
        }
    };

    /**
     * Save insights to Firebase for caching
     */
    const cacheInsights = async (insightsData) => {
        if (!user?.uid) return;

        try {
            const safeInsightsData = {
                ...insightsData,
                cachedAt: new Date(),
                timestamp: insightsData.timestamp || new Date().toISOString(),
                insights: insightsData.insights || '',
                success: insightsData.success !== undefined ? insightsData.success : true
            };

            await FirebaseService.saveOrUpdateDocument(
                'financialInsights',
                user.uid,
                safeInsightsData
            );
        } catch (error) {
            console.error('Error caching insights:', error);
            // Don't throw - caching failure shouldn't break the feature
        }
    };

    /**
     * Enhanced insights parsing with better structure extraction
     */
    const parseStructuredInsights = (text) => {
        if (!text) return null;

        const result = {
            financialHealthScore: null,
            priorityActions: [],
            sections: {},
            riskFactors: [],
            recommendations: []
        };

        // Extract financial health score
        const scoreMatch = text.match(/(?:financial\s+health\s+score|score)[:\s]*(\d+(?:\.\d+)?)\s*(?:\/\s*10|out\s+of\s+10)/i);
        if (scoreMatch) {
            result.financialHealthScore = parseFloat(scoreMatch[1]);
        }

        // Extract priority actions more reliably
        const actionMatches = text.match(/top\s+3?\s+priority\s+actions?[:\s]*([\s\S]*?)(?=###|$)/i);
        if (actionMatches) {
            const actionsText = actionMatches[1];
            const actions = actionsText.match(/\d+\.\s*\*\*([^*]+)\*\*/g);

            if (actions) {
                result.priorityActions = actions.map(action => {
                    return action.replace(/^\d+\.\s*\*\*/, '').replace(/\*\*$/, '').replace(/:$/, '').trim();
                }).slice(0, 3);
            }
        }

        return result;
    };

    /**
     * Check if we have enough data for analysis
     */
    const hasMinimumData = taxCalculations && (expenses.length > 0 || creditCards.length > 0);

    /**
     * Check if API is configured
     */
    const isApiConfigured = hasApiKey && typeof hasApiKey === 'function' ? hasApiKey() : false;

    /**
     * Get financial insights from ChatGPT
     */
    const getInsights = useCallback(async (useSample = false) => {
        setLoading(true);
        setError(null);

        try {
            let result;

            if (useSample || !isApiConfigured) {
                // Use sample insights for demo or when no API key
                const financialData = ChatGPTFinancialService.prepareFinancialData({
                    paycheckData,
                    expenses,
                    creditCards,
                    taxCalculations
                });
                result = ChatGPTFinancialService.generateSampleInsights(financialData);
            } else {
                // Use real ChatGPT API with stored user API key
                result = await ChatGPTFinancialService.getFinancialInsightsWithRetry({
                    userId: user?.uid,
                    paycheckData,
                    expenses,
                    creditCards,
                    taxCalculations,
                    focusArea: focusArea.trim() || null
                });

                // Cache the results if using real API
                await cacheInsights(result);
            }

            // Parse the insights for better display using enhanced parsing
            const structuredInsights = parseStructuredInsights(result.insights);
            result.structuredInsights = structuredInsights;

            setInsights(result);
        } catch (error) {
            console.error('Error getting financial insights:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [user?.uid, paycheckData, expenses, creditCards, taxCalculations, focusArea, isApiConfigured]);

    /**
     * Copy insights to clipboard
     */
    const copyInsights = useCallback(async () => {
        if (!insights?.insights) return;

        try {
            await navigator.clipboard.writeText(insights.insights);
            alert('Insights copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy:', error);
            alert('Failed to copy to clipboard');
        }
    }, [insights]);

    /**
     * Download insights as text file
     */
    const downloadInsights = useCallback(() => {
        if (!insights?.insights) return;

        const blob = new Blob([insights.insights], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-insights-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [insights]);

    /**
     * Get health score color
     */
    const getHealthScoreColor = (score) => {
        if (score >= 8) return 'text-green-600';
        if (score >= 6) return 'text-yellow-600';
        if (score >= 4) return 'text-orange-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Brain className="w-6 h-6 mr-2 text-indigo-600" />
                        AI Financial Insights
                    </h2>
                    <p className="text-gray-600">
                        Get personalized financial advice powered by ChatGPT
                    </p>
                </div>
                <div className="flex space-x-2">
                    {onNavigateToSettings && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onNavigateToSettings}
                            icon={<Settings className="w-4 h-4" />}
                        >
                            API Settings
                        </Button>
                    )}
                </div>
            </div>

            {/* Cache Status */}
            {insights && insights.cachedAt && (
                <Alert type="info">
                    <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4" />
                        <span>
                            Analysis cached on {new Date(insights.cachedAt).toLocaleDateString()} -
                            {insights.isSample ? ' Sample data' : ' Using your OpenAI API'}
                        </span>
                    </div>
                </Alert>
            )}

            {/* API Key Status */}
            {!isApiConfigured && (
                <Alert type="info" title="API Key Required">
                    <div className="space-y-2">
                        <p>To get personalized AI insights, you need to configure your OpenAI API key.</p>
                        <div className="flex items-center space-x-4">
                            {onNavigateToSettings && (
                                <Button
                                    size="sm"
                                    onClick={onNavigateToSettings}
                                    icon={<Settings className="w-4 h-4" />}
                                >
                                    Configure API Key
                                </Button>
                            )}
                            <a
                                href="https://platform.openai.com/api-keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
                            >
                                Get API Key <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                        </div>
                    </div>
                </Alert>
            )}

            {/* Data Check Alert */}
            {!hasMinimumData && (
                <Alert type="info" title="More Data Needed">
                    Add your paycheck information and some expenses or credit cards to get personalized financial insights.
                </Alert>
            )}

            {/* Focus Area Input */}
            {hasMinimumData && (
                <Card title="Analysis Focus">
                    <div className="space-y-4">
                        <Input
                            label="Focus Area (Optional)"
                            value={focusArea}
                            onChange={(e) => setFocusArea(e.target.value)}
                            placeholder="e.g., 'debt reduction', 'saving for a house', 'retirement planning'"
                            help="Tell the AI what specific area of your finances you'd like to focus on"
                        />

                        <div className="flex space-x-3">
                            {isApiConfigured ? (
                                <Button
                                    onClick={() => getInsights(false)}
                                    disabled={loading || !hasMinimumData}
                                    loading={loading}
                                    icon={<Brain className="w-4 h-4" />}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Get AI Insights
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => getInsights(true)}
                                    disabled={loading || !hasMinimumData}
                                    loading={loading}
                                    icon={<Lightbulb className="w-4 h-4" />}
                                    className="bg-gray-600 hover:bg-gray-700"
                                >
                                    Try Sample Insights
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                onClick={() => getInsights(true)}
                                disabled={loading}
                                icon={<Lightbulb className="w-4 h-4" />}
                            >
                                Sample Insights
                            </Button>

                            {insights && (
                                <Button
                                    variant="outline"
                                    onClick={() => getInsights(isApiConfigured)}
                                    disabled={loading}
                                    icon={<RefreshCw className="w-4 h-4" />}
                                >
                                    Refresh
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Error Display */}
            {error && (
                <Alert type="error" title="Analysis Error">
                    {error}
                    {error.includes('API key') && onNavigateToSettings && (
                        <div className="mt-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onNavigateToSettings}
                            >
                                Configure API Key
                            </Button>
                        </div>
                    )}
                </Alert>
            )}

            {/* Loading State */}
            {loading && (
                <Card className="text-center py-8">
                    <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Analyzing Your Financial Data
                    </h3>
                    <p className="text-gray-600">
                        This may take a few moments...
                    </p>
                </Card>
            )}

            {/* Insights Display */}
            {insights && !loading && (
                <div className="space-y-6">
                    {/* Financial Health Score */}
                    {insights.structuredInsights?.financialHealthScore && (
                        <Card title="Financial Health Score">
                            <div className="text-center">
                                <div className={`text-4xl font-bold mb-2 ${getHealthScoreColor(insights.structuredInsights.financialHealthScore)}`}>
                                    {insights.structuredInsights.financialHealthScore}/10
                                </div>
                                <p className="text-gray-600">
                                    {insights.structuredInsights.financialHealthScore >= 8 ? 'Excellent' :
                                        insights.structuredInsights.financialHealthScore >= 6 ? 'Good' :
                                            insights.structuredInsights.financialHealthScore >= 4 ? 'Fair' : 'Needs Improvement'}
                                </p>
                            </div>
                        </Card>
                    )}

                    {/* Priority Actions */}
                    {insights.structuredInsights?.priorityActions?.length > 0 && (
                        <Card title="Top Priority Actions" icon={<Target className="w-5 h-5 text-orange-600" />}>
                            <div className="space-y-3">
                                {insights.structuredInsights.priorityActions.map((action, index) => (
                                    <div key={index} className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg border border-orange-100">
                                        <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-900 font-medium">{action}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Detailed Analysis with Enhanced Formatting */}
                    <Card
                        title="Detailed Analysis"
                        headerActions={
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyInsights}
                                    icon={<Copy className="w-3 h-3" />}
                                    title="Copy to clipboard"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={downloadInsights}
                                    icon={<Download className="w-3 h-3" />}
                                    title="Download as text file"
                                />
                            </div>
                        }
                    >
                        <div className="prose max-w-none">
                            {/* Use the enhanced formatting function */}
                            {formatInsightsContent(insights.insights)}
                        </div>

                        {/* Metadata */}
                        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
                            <div className="flex justify-between items-center">
                                <span>
                                    Generated: {new Date(insights.timestamp).toLocaleString()}
                                </span>
                                <div className="flex space-x-2">
                                    {insights.cachedAt && (
                                        <Badge variant="outline">Cached in Database</Badge>
                                    )}
                                    {insights.isSample && (
                                        <Badge variant="outline">Sample Analysis</Badge>
                                    )}
                                    {insights.usage?.total_tokens && (
                                        <Badge variant="default">
                                            {insights.usage.total_tokens} tokens used
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Usage Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-blue-900 font-medium mb-2">How it works</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Configure your OpenAI API key in API Settings to get personalized insights</li>
                    <li>• Each analysis costs approximately $0.001-0.003 (very affordable!)</li>
                    <li>• Insights are automatically cached in the database for quick access</li>
                    <li>• Try sample insights to see what kind of analysis you'll get</li>
                    <li>• Your financial data is processed securely and never stored by OpenAI</li>
                </ul>
            </div>
        </div>
    );
};

export default FinancialInsights;