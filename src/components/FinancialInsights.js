import React, { useState, useCallback } from 'react';
import {
    Brain,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Lightbulb,
    Settings,
    RefreshCw,
    Eye,
    EyeOff,
    Copy,
    Download
} from 'lucide-react';
import { ChatGPTFinancialService } from '../services/ChatGPTFinancialService';
import { Card, Button, Alert, Input, Modal, Badge, LoadingSpinner } from './UI';

/**
 * Financial Insights Component
 * Integrates with ChatGPT to provide personalized financial advice
 */
const FinancialInsights = ({
                               paycheckData,
                               expenses,
                               creditCards,
                               taxCalculations,
                               userSettings = {},
                               onSaveSettings
                           }) => {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [focusArea, setFocusArea] = useState('');

    // Settings state
    const [apiKey, setApiKey] = useState(userSettings.openaiApiKey || '');
    const [autoAnalyze, setAutoAnalyze] = useState(userSettings.autoAnalyze || false);
    const [includeGoals, setIncludeGoals] = useState(userSettings.includeGoals || true);

    /**
     * Get financial insights from ChatGPT
     */
    const getInsights = useCallback(async (useSample = false) => {
        setLoading(true);
        setError(null);

        try {
            let result;

            if (useSample || !apiKey) {
                // Use sample insights for demo or when no API key
                const financialData = ChatGPTFinancialService.prepareFinancialData({
                    paycheckData,
                    expenses,
                    creditCards,
                    taxCalculations
                });
                result = ChatGPTFinancialService.generateSampleInsights(financialData);
            } else {
                // Use real ChatGPT API
                result = await ChatGPTFinancialService.getFinancialInsightsWithRetry({
                    apiKey,
                    paycheckData,
                    expenses,
                    creditCards,
                    taxCalculations,
                    focusArea: focusArea.trim() || null
                });
            }

            setInsights(result);
        } catch (error) {
            console.error('Error getting financial insights:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [apiKey, paycheckData, expenses, creditCards, taxCalculations, focusArea]);

    /**
     * Save settings
     */
    const saveSettings = useCallback(async () => {
        const settings = {
            openaiApiKey: apiKey,
            autoAnalyze,
            includeGoals
        };

        try {
            if (onSaveSettings) {
                await onSaveSettings(settings);
            }
            setShowSettings(false);
        } catch (error) {
            console.error('Error saving settings:', error);
            setError('Failed to save settings');
        }
    }, [apiKey, autoAnalyze, includeGoals, onSaveSettings]);

    /**
     * Copy insights to clipboard
     */
    const copyInsights = useCallback(async () => {
        if (!insights?.insights) return;

        try {
            await navigator.clipboard.writeText(insights.insights);
            // Could add a toast notification here
        } catch (error) {
            console.error('Failed to copy:', error);
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
     * Check if we have enough data for analysis
     */
    const hasMinimumData = taxCalculations && (expenses.length > 0 || creditCards.length > 0);

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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSettings(true)}
                        icon={<Settings className="w-4 h-4" />}
                    >
                        Settings
                    </Button>
                </div>
            </div>

            {/* Data Check Alert */}
            {!hasMinimumData && (
                <Alert type="info" title="More Data Needed">
                    Add your paycheck information and some expenses or credit cards to get personalized financial insights.
                </Alert>
            )}

            {/* Focus Area Input */}
            {hasMinimumData && (
                <Card title="Analysis Focus" className="mb-4">
                    <div className="space-y-4">
                        <Input
                            label="Focus Area (Optional)"
                            value={focusArea}
                            onChange={(e) => setFocusArea(e.target.value)}
                            placeholder="e.g., 'debt reduction', 'saving for a house', 'retirement planning'"
                            help="Tell the AI what specific area of your finances you'd like to focus on"
                        />

                        <div className="flex space-x-3">
                            <Button
                                onClick={() => getInsights(false)}
                                disabled={loading || !hasMinimumData}
                                loading={loading}
                                icon={<Brain className="w-4 h-4" />}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                {apiKey ? 'Get AI Insights' : 'Try Sample Analysis'}
                            </Button>

                            {!apiKey && (
                                <Button
                                    variant="outline"
                                    onClick={() => getInsights(true)}
                                    disabled={loading}
                                    icon={<Lightbulb className="w-4 h-4" />}
                                >
                                    Sample Insights
                                </Button>
                            )}

                            {insights && (
                                <Button
                                    variant="outline"
                                    onClick={() => getInsights(false)}
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
                    {error.includes('API key') && (
                        <div className="mt-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowSettings(true)}
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
                        <Card title="Top Priority Actions">
                            <div className="space-y-3">
                                {insights.structuredInsights.priorityActions.map((action, index) => (
                                    <div key={index} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                                        <div className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-900">{action}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Full Insights */}
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
                            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                                {insights.insights}
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
                            <div className="flex justify-between items-center">
                                <span>
                                    Generated: {new Date(insights.timestamp).toLocaleString()}
                                </span>
                                <div className="flex space-x-2">
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

            {/* Settings Modal */}
            <Modal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                title="AI Insights Settings"
                size="lg"
            >
                <div className="space-y-6">
                    {/* API Key Configuration */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                                OpenAI API Key
                            </label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowApiKey(!showApiKey)}
                                icon={showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            >
                                {showApiKey ? 'Hide' : 'Show'}
                            </Button>
                        </div>
                        <Input
                            type={showApiKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            help="Your OpenAI API key. Get one at https://platform.openai.com/api-keys"
                        />

                        {!apiKey && (
                            <Alert type="info" className="mt-3">
                                Without an API key, you can only use sample insights. Add your OpenAI API key to get personalized AI analysis.
                            </Alert>
                        )}
                    </div>

                    {/* Other Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Auto-analyze on data changes
                                </label>
                                <p className="text-sm text-gray-500">
                                    Automatically get new insights when your financial data changes
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={autoAnalyze}
                                onChange={(e) => setAutoAnalyze(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                        </div>
                    </div>

                    {/* API Usage Info */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">
                            API Usage & Costs
                        </h4>
                        <div className="text-sm text-blue-800 space-y-1">
                            <p>• Each analysis uses approximately 1,000-2,000 tokens</p>
                            <p>• GPT-4o-mini costs ~$0.001-0.003 per analysis</p>
                            <p>• Your API key is stored locally and never shared</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                        <Button
                            onClick={saveSettings}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        >
                            Save Settings
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowSettings(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FinancialInsights;