'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  GitBranch,
  Search,
  BarChart3
} from 'lucide-react'
import { AnalysisType, AnalysisStatus, Severity, Finding } from '@/types'

interface DemoDocument {
  id: string
  title: string
  content: string
  status: string
  createdAt: Date
}

interface DemoAnalysis {
  id: string
  documentId: string
  type: AnalysisType
  status: AnalysisStatus
  results?: any
  startedAt: Date
  completedAt?: Date
}

export default function PatentFlowDemo() {
  const [documents, setDocuments] = useState<DemoDocument[]>([])
  const [analyses, setAnalyses] = useState<DemoAnalysis[]>([])
  const [activeTab, setActiveTab] = useState('documents')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Initialize with demo data
    const demoDocument: DemoDocument = {
      id: 'demo-doc-1',
      title: 'Rotary Shaft Assembly System',
      content: `TITLE: Rotary Shaft Assembly System

ABSTRACT
A rotary shaft assembly system comprising a housing, a rotary shaft positioned within the housing, and a bearing assembly supporting the rotary shaft for rotational movement.

BACKGROUND
Rotary shaft systems are commonly used in various mechanical applications. However, existing systems often suffer from alignment issues and excessive wear.

SUMMARY
The present invention provides an improved rotary shaft assembly system with enhanced alignment and reduced wear characteristics.

DETAILED DESCRIPTION
Referring to FIG. 1, the rotary shaft assembly system 10 includes a housing 12, a rotary shaft 14, and a bearing assembly 16.

CLAIMS
1. A rotary shaft assembly system comprising:
   a housing;
   a rotary shaft positioned within said housing; and
   a bearing assembly supporting said rotary shaft.

2. The system of claim 1, wherein the bearing assembly comprises ball bearings.

3. The system of claim 1, wherein the rotary shaft further comprises a gear portion.

4. The method of claim 15, further comprising the step of lubricating the bearing assembly.`,
      status: 'DRAFT',
      createdAt: new Date(),
    }

    setDocuments([demoDocument])
  }, [])

  const startAnalysis = (documentId: string, type: AnalysisType) => {
    setLoading(true)

    const newAnalysis: DemoAnalysis = {
      id: `analysis-${Date.now()}`,
      documentId,
      type,
      status: AnalysisStatus.RUNNING,
      startedAt: new Date(),
    }

    setAnalyses(prev => [newAnalysis, ...prev])

    const sampleResults = {
      [AnalysisType.CLAIMS_ANALYSIS]: {
        summary: {
          score: 82,
          criticalIssues: 1,
          highIssues: 2,
          mediumIssues: 3,
          lowIssues: 2,
          totalIssues: 8,
          recommendations: [
            'Tighten antecedent basis for Claim 5.',
            'Clarify dependent claim references to avoid ambiguity.',
            'Group related terms to simplify examiner review.',
          ],
        },
        findings: [
          {
            title: 'Ambiguous dependency in Claim 7',
            description: 'Claim 7 references an undefined element from Claim 6.',
            severity: 'HIGH' as Severity,
            suggestion: 'Update Claim 7 to reference the correct element from Claim 5.',
            context: 'Claim 7: The assembly of claim 6 wherein the bearing assembly...',
          },
          {
            title: 'Missing antecedent basis',
            description: 'Claim 5 introduces "the gear portion" without prior definition.',
            severity: 'CRITICAL' as Severity,
            suggestion: 'Define "gear portion" when first mentioned or adjust dependencies.',
            context: 'Claim 5: The system of claim 4 wherein the gear portion engages...',
          },
        ],
        claimGraph: {
          nodes: [
            { claimNumber: 1, type: 'independent' },
            { claimNumber: 2, type: 'dependent' },
            { claimNumber: 3, type: 'dependent' },
            { claimNumber: 4, type: 'dependent' },
          ],
          edges: [
            { from: 2, to: 1 },
            { from: 3, to: 1 },
            { from: 4, to: 2 },
          ],
        },
      },
      [AnalysisType.TERMINOLOGY_ANALYSIS]: {
        summary: {
          score: 90,
          criticalIssues: 0,
          highIssues: 1,
          mediumIssues: 2,
          lowIssues: 1,
          totalIssues: 4,
          recommendations: [
            'Normalize references to the bearing assembly.',
            'Standardize capitalisation for defined terms.',
          ],
        },
        findings: [
          {
            title: 'Inconsistent term: housing vs. casing',
            description: 'Both "housing" and "casing" are used for the same structure.',
            severity: 'MEDIUM' as Severity,
            suggestion: 'Use "housing" consistently throughout the specification.',
            context: 'Specification paragraph 12: The casing includes...',
          },
          {
            title: 'Capitalisation mismatch',
            description: '"Rotary shaft assembly" alternates between capitalised and lowercase.',
            severity: 'LOW' as Severity,
            suggestion: 'Capitalize defined terms in all occurrences.',
            context: 'Abstract: A rotary shaft assembly system comprising...',
          },
        ],
      },
    }

    setTimeout(() => {
      setAnalyses(prev =>
        prev.map(analysis =>
          analysis.id === newAnalysis.id
            ? {
                ...analysis,
                status: AnalysisStatus.COMPLETED,
                completedAt: new Date(),
                results: sampleResults[type as keyof typeof sampleResults],
              }
            : analysis
        )
      )
      setLoading(false)
    }, 1200)
  }

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'INFO': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: AnalysisStatus) => {
    switch (status) {
      case AnalysisStatus.COMPLETED: return <CheckCircle className="w-4 h-4 text-green-500" />
      case AnalysisStatus.RUNNING: return <Clock className="w-4 h-4 text-blue-500 animate-spin" />
      case AnalysisStatus.FAILED: return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const renderFindings = (findings: Finding[]) => {
    return (
      <div className="space-y-3">
        {findings.map((finding, index) => (
          <Card key={index} className={`border-l-4 ${getSeverityColor(finding.severity)}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm">{finding.title}</h4>
                <Badge variant="outline" className={getSeverityColor(finding.severity)}>
                  {finding.severity}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">{finding.description}</p>
              {finding.suggestion && (
                <div className="bg-blue-50 p-2 rounded text-sm text-blue-800">
                  <strong>Suggestion:</strong> {finding.suggestion}
                </div>
              )}
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                {finding.context}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderClaimGraph = (graphData: any) => {
    if (!graphData || !graphData.nodes) return null

    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-4">Claim Dependency Graph</h4>
        <div className="flex flex-wrap gap-2">
          {graphData.nodes.map((node: any, index: number) => (
            <div
              key={index}
              className={`px-3 py-2 rounded-lg border ${
                node.type === 'independent' 
                  ? 'bg-blue-100 border-blue-300' 
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <div className="font-semibold text-sm">Claim {node.claimNumber}</div>
              <div className="text-xs text-gray-600">{node.type}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Dependencies: {graphData.edges?.map((edge: any) => `${edge.from}→${edge.to}`).join(', ') || 'None'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">PatentFlow Demo</h2>
          <p className="text-gray-600">Experience the power of AI-powered patent analysis</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <FileText className="w-4 h-4 mr-2" />
          Reset Demo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="graphs">Graphs</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sample Patent Document</CardTitle>
              <CardDescription>
                A rotary shaft assembly system patent application for demonstration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.map((doc) => (
                <div key={doc.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{doc.title}</h3>
                      <p className="text-sm text-gray-600">
                        Status: <Badge variant="outline">{doc.status}</Badge>
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Button
                        size="sm"
                        onClick={() => startAnalysis(doc.id, AnalysisType.CLAIMS_ANALYSIS)}
                        disabled={loading}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Analyze Claims
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startAnalysis(doc.id, AnalysisType.TERMINOLOGY_ANALYSIS)}
                        disabled={loading}
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Check Terms
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <ScrollArea className="h-64 w-full border rounded p-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {doc.content}
                    </pre>
                  </ScrollArea>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Queue</CardTitle>
              <CardDescription>
                Track the progress of your patent analyses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No analyses started yet. Run an analysis from the Documents tab.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analyses.map((analysis) => (
                    <Card key={analysis.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(analysis.status)}
                            <span className="font-semibold">{analysis.type.replace('_', ' ')}</span>
                          </div>
                          <Badge variant="outline">
                            {analysis.status}
                          </Badge>
                        </div>
                        
                        {analysis.status === AnalysisStatus.RUNNING && (
                          <div className="space-y-2">
                            <Progress value={65} className="w-full" />
                            <p className="text-sm text-gray-600">Analyzing document...</p>
                          </div>
                        )}
                        
                        {analysis.status === AnalysisStatus.COMPLETED && (
                          <div className="text-sm text-green-600">
                            Analysis completed successfully!
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500 mt-2">
                          Started: {analysis.startedAt.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {analyses.filter(a => a.status === AnalysisStatus.COMPLETED && a.results).map((analysis) => (
            <Card key={analysis.id}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  {analysis.type.replace('_', ' ')} Results
                </CardTitle>
                <CardDescription>
                  Analysis completed with {analysis.results?.summary?.totalIssues || 0} issues found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.results?.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {analysis.results.summary.score}
                      </div>
                      <div className="text-sm text-gray-600">Quality Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {analysis.results.summary.criticalIssues}
                      </div>
                      <div className="text-sm text-gray-600">Critical</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {analysis.results.summary.highIssues}
                      </div>
                      <div className="text-sm text-gray-600">High</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {analysis.results.summary.mediumIssues}
                      </div>
                      <div className="text-sm text-gray-600">Medium</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {analysis.results.summary.lowIssues}
                      </div>
                      <div className="text-sm text-gray-600">Low</div>
                    </div>
                  </div>
                )}

                {analysis.results?.findings && (
                  <div>
                    <h4 className="font-semibold mb-4">Issues Found</h4>
                    {renderFindings(analysis.results.findings)}
                  </div>
                )}

                {analysis.results?.summary?.recommendations && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Recommendations</h4>
                    <ul className="space-y-2">
                      {analysis.results.summary.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="graphs" className="space-y-4">
          {analyses.filter(a => a.status === AnalysisStatus.COMPLETED && a.results?.claimGraph).map((analysis) => (
            <Card key={analysis.id}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GitBranch className="w-5 h-5 mr-2 text-blue-500" />
                  Claim Dependency Graph
                </CardTitle>
                <CardDescription>
                  Visual representation of claim dependencies and relationships
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderClaimGraph(analysis.results.claimGraph)}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}