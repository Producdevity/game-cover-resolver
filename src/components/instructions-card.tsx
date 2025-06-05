import { ApiType } from '@/app/page'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface InstructionsCardProps {
  activeApi: ApiType
}

export function InstructionsCard(props: InstructionsCardProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>How to Use</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Select your preferred game database API (RAWG, TheGamesDB, or IGDB)
          </li>
          <li>
            {props.activeApi === 'rawg'
              ? 'Optionally add your RAWG API key for better rate limits'
              : props.activeApi === 'thegamesdb'
                ? 'Add your TheGamesDB API key (required)'
                : 'Add your IGDB Client ID and Client Secret (required)'}
          </li>
          <li>
            Paste your JSON array in the input field (each game needs 'title'
            and 'systemName')
          </li>
          <li>Click "Process Games" to fetch real cover images</li>
          <li>Review the enhanced JSON with imageUrl properties added</li>
          <li>Copy to clipboard or download the result</li>
        </ol>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">About the APIs:</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>RAWG:</strong> Largest video game database with 500,000+
              games. Works without an API key (limited to 1 request per second)
              or with a free API key (20,000 requests per month).
            </p>
            <p>
              <strong>TheGamesDB:</strong> Community-driven game database with
              excellent retro game coverage. Requires an API key but offers
              great results for older and obscure titles.
            </p>
            <p>
              <strong>IGDB:</strong> Professional game database with
              high-quality cover images and comprehensive data. Requires Twitch
              Developer credentials (Client ID and Client Secret).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
