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
     * Parse insights text into structured format
     */
    const parseInsightsText = (text) => {
        if (!text) return null;

        const sections = {};
        let currentSection = '';
        let currentContent = '';

        const lines = text.split('\n');

        for (const line of lines) {
            // Check for section headers (markdown style)
            if (line.startsWith('**') && line.endsWith('**')) {
                // Save previous section
                if (currentSection && currentContent) {
                    sections[currentSection] = currentContent.trim();
                }

                // Start new section
                currentSection = line.replace(/\*\*/g, '').toLowerCase();
                currentContent = '';
            } else if (line.startsWith('### **') && line.endsWith('**')) {
                // Save previous section
                if (currentSection && currentContent) {
                    sections[currentSection] = currentContent.trim();
                }

                // Start new section
                currentSection = line.replace(/### \*\*/g, '').replace(/\*\*/g, '').toLowerCase();
                currentContent = '';
            } else if (line.trim()) {
                currentContent += line + '\n';
            }
        }

        // Save last section
        if (currentSection && currentContent) {
            sections[currentSection] = currentContent.trim();
        }

        return sections;
    };

    /**
     * Extract financial health score from text
     */
    const extractHealthScore = (text) => {
        const scoreMatch = text.match(/(?:score|health).*?(\d+)(?:\/10|\s*out\s*of\s*10)/i);
        return scoreMatch ? parseInt(scoreMatch[1]) : null;
    };

    /**
     * Extract priority actions from text
     */
    const extractPriorityActions = (text) => {
        const actions = [];
        const actionMatches = text.match(/\d+\.\s*\*\*([^*]+)\*\*:?\s*([^]*?)(?=\d+\.\s*\*\*|$)/g);

        if (actionMatches) {
            actionMatches.forEach(match => {
                const cleanMatch = match.replace(/\d+\.\s*\*\*/, '').replace(/\*\*/g, '');
                const parts = cleanMatch.split(':');
                actions.push(parts[0].trim());
            });
        }

        return actions.slice(0, 3); // Top 3 only
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

            // Parse the insights for better display
            const parsedSections = parseInsightsText(result.insights);
            const healthScore = extractHealthScore(result.insights);
            const priorityActions = extractPriorityActions(result.insights);

            result.structuredInsights = {
                financialHealthScore: healthScore,
                priorityActions: priorityActions,
                sections: parsedSections
            };

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

    /**
     * Format text content with better styling
     */
    const formatTextContent = (text) => {
        if (!text) return null;

        return text.split('\n').map((line, index) => {
            // Handle bullet points
            if (line.trim().startsWith('-')) {
                return (
                    <li key={index} className="ml-4 text-gray-700">
                        {line.replace(/^-\s*/, '')}
                    </li>
                );
            }

            // Handle numbered items
            if (/^\d+\./.test(line.trim())) {
                return (
                    <li key={index} className="ml-4 text-gray-700 font-medium">
                        {line.replace(/^\d+\.\s*/, '')}
                    </li>
                );
            }

            // Handle bold text
            if (line.includes('**')) {
                const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return (
                    <p key={index} className="text-gray-800 mb-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />
                );
            }

            // Regular text
            if (line.trim()) {
                return (
                    <p key={index} className="text-gray-700 mb-2">
                        {line}
                    </p>
                );
            }

            return <br key={index} />;
        });
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
                            <div className="text-gray-800 leading-relaxed">
                                {formatTextContent(insights.insights)}
                            </div>
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