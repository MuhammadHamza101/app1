import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface ClaimNode {
  number: string
  text: string
  parent?: string
  children: ClaimNode[]
}

interface ClaimTreeProps {
  claims: ClaimNode[]
}

function renderNode(node: ClaimNode) {
  return (
    <AccordionItem key={node.number} value={node.number}>
      <AccordionTrigger className="text-left">
        <div className="flex items-center gap-2">
          <Badge variant={node.parent ? 'secondary' : 'default'}>Claim {node.number}</Badge>
          {node.parent && <span className="text-xs text-muted-foreground">depends on {node.parent}</span>}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <p className="text-sm leading-6 whitespace-pre-wrap">{node.text}</p>
        {node.children.length > 0 && (
          <div className="ml-4 mt-3 space-y-2 border-l pl-4">
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

export function ClaimTree({ claims }: ClaimTreeProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim tree</CardTitle>
      </CardHeader>
      <CardContent>
        {claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No claims available for this patent.</p>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {claims.map((claim) => renderNode(claim))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
}
