"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Download, Loader2, CheckCircle, Eye, EyeOff, RefreshCw, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface GameItem {
  title: string
  systemName: string
  imageUrl?: string
}

interface RAWGGame {
  id: number
  name: string
  background_image: string
  platforms: Array<{
    platform: {
      id: number
      name: string
    }
  }>
}

interface RAWGResponse {
  results: RAWGGame[]
}

interface TheGamesDBGame {
  id: number
  game_title: string
  release_date?: string
  platform: number
  boxart?: {
    front?: {
      filename: string
      resolution: string
    }
    back?: {
      filename: string
      resolution: string
    }
  }
}

interface TheGamesDBResponse {
  code: number
  status: string
  data: {
    count: number
    games: TheGamesDBGame[]
  }
  pages?: {
    previous: string
    current: string
    next: string
  }
  remaining_monthly_allowance?: number
  extra_allowance?: number
}

interface TheGamesDBImageData {
  base_url: string
  data: {
    [key: string]: {
      [key: string]: {
        resolution: string
        filename: string
      }[]
    }
  }
}

interface IGDBGame {
  id: number
  name: string
  cover?: {
    id: number
    url?: string
    image_id: string
  }
  platforms?: number[]
}

interface IGDBAuthResponse {
  access_token: string
  expires_in: number
  token_type: string
}

// Platform mapping for RAWG API
const PLATFORM_MAPPING: Record<string, number[]> = {
  // Microsoft
  "microsoft windows": [4],
  "microsoft xbox 360": [14],
  "microsoft xbox": [80],

  // Nintendo
  "nintendo 3ds": [8],
  "nintendo 64": [83],
  "nintendo ds": [9],
  "nintendo gamecube": [11],
  "nintendo switch": [7],
  "nintendo wii u": [10],
  "nintendo wii": [10],

  // Sega
  "sega dreamcast": [106],
  "sega saturn": [107],

  // Sony
  "sony playstation 2": [15],
  "sony playstation 3": [16],
  "sony playstation 4": [18],
  "sony playstation 5": [187],
  "sony playstation portable": [17],
  "sony playstation vita": [19],
  "sony playstation": [27],
}

// Platform mapping for TheGamesDB API
const TGDB_PLATFORM_MAPPING: Record<string, number[]> = {
  // Microsoft
  "microsoft windows": [1],
  "microsoft xbox 360": [15],
  "microsoft xbox": [14],

  // Nintendo
  "nintendo 3ds": [4912],
  "nintendo 64": [3],
  "nintendo ds": [12],
  "nintendo gamecube": [2],
  "nintendo switch": [4971],
  "nintendo wii u": [38],
  "nintendo wii": [9],

  // Sega
  "sega dreamcast": [16],
  "sega saturn": [17],

  // Sony
  "sony playstation 2": [8],
  "sony playstation 3": [4911],
  "sony playstation 4": [4919],
  "sony playstation 5": [4980],
  "sony playstation portable": [13],
  "sony playstation vita": [39],
  "sony playstation": [10],
}

// Platform mapping for IGDB API
const IGDB_PLATFORM_MAPPING: Record<string, number[]> = {
  // Microsoft
  "microsoft windows": [6],
  "microsoft xbox 360": [12],
  "microsoft xbox": [11],

  // Nintendo
  "nintendo 3ds": [37],
  "nintendo 64": [4],
  "nintendo ds": [20],
  "nintendo gamecube": [21],
  "nintendo switch": [130],
  "nintendo wii u": [41],
  "nintendo wii": [5],

  // Sega
  "sega dreamcast": [23],
  "sega saturn": [32],

  // Sony
  "sony playstation 2": [8],
  "sony playstation 3": [9],
  "sony playstation 4": [48],
  "sony playstation 5": [167],
  "sony playstation portable": [38],
  "sony playstation vita": [46],
  "sony playstation": [7],
}

// API Type
type ApiType = "rawg" | "thegamesdb" | "igdb"

async function fetchGameCover(
  title: string,
  systemName: string,
  apiType: ApiType,
  apiKey?: string,
  apiSecret?: string,
): Promise<string> {
  if (apiType === "rawg") {
    return fetchGameCoverFromRAWG(title, systemName, apiKey)
  } else if (apiType === "thegamesdb") {
    return fetchGameCoverFromTheGamesDB(title, systemName, apiKey)
  } else {
    return fetchGameCoverFromIGDB(title, systemName, apiKey, apiSecret)
  }
}

async function fetchGameCoverFromRAWG(title: string, systemName: string, apiKey?: string): Promise<string> {
  try {
    // Get platform IDs for the system
    const platformIds = PLATFORM_MAPPING[systemName.toLowerCase()] || []

    // Build search URL
    const baseUrl = "https://api.rawg.io/api/games"
    const params = new URLSearchParams({
      search: title,
      page_size: "10",
    })

    if (apiKey) {
      params.append("key", apiKey)
    }

    if (platformIds.length > 0) {
      params.append("platforms", platformIds.join(","))
    }

    const response = await fetch(`${baseUrl}?${params}`)

    if (!response.ok) {
      throw new Error(`RAWG API error: ${response.status}`)
    }

    const data: RAWGResponse = await response.json()

    if (data.results && data.results.length > 0) {
      // Find the best match
      let bestMatch = data.results[0]

      // Try to find exact title match first
      const exactMatch = data.results.find((game) => game.name.toLowerCase() === title.toLowerCase())

      if (exactMatch) {
        bestMatch = exactMatch
      } else {
        // Find match with correct platform if specified
        if (platformIds.length > 0) {
          const platformMatch = data.results.find((game) =>
            game.platforms?.some((p) => platformIds.includes(p.platform.id)),
          )
          if (platformMatch) {
            bestMatch = platformMatch
          }
        }
      }

      return bestMatch.background_image || ""
    }

    return ""
  } catch (error) {
    console.error(`Failed to fetch cover from RAWG for ${title}:`, error)
    return ""
  }
}

async function fetchGameCoverFromTheGamesDB(title: string, systemName: string, apiKey?: string): Promise<string> {
  if (!apiKey) {
    console.error("TheGamesDB API requires an API key")
    return ""
  }

  try {
    // Get platform IDs for the system
    const platformIds = TGDB_PLATFORM_MAPPING[systemName.toLowerCase()] || []

    // Build search URL
    const baseUrl = "https://api.thegamesdb.net/v1"
    const params = new URLSearchParams({
      apikey: apiKey,
      name: title,
      fields: "platform,release_date,boxart",
    })

    if (platformIds.length > 0) {
      params.append("filter[platform]", platformIds.join(","))
    }

    // Search for the game
    const response = await fetch(`${baseUrl}/Games/ByGameName?${params}`)

    if (!response.ok) {
      throw new Error(`TheGamesDB API error: ${response.status}`)
    }

    const data: TheGamesDBResponse = await response.json()

    if (data.data && data.data.games && data.data.games.length > 0) {
      // Find the best match
      let bestMatch = data.data.games[0]

      // Try to find exact title match first
      const exactMatch = data.data.games.find((game) => game.game_title.toLowerCase() === title.toLowerCase())

      if (exactMatch) {
        bestMatch = exactMatch
      } else if (platformIds.length > 0) {
        // Find match with correct platform if specified
        const platformMatch = data.data.games.find((game) => platformIds.includes(game.platform))
        if (platformMatch) {
          bestMatch = platformMatch
        }
      }

      // If we have boxart, we need to get the image URL
      if (bestMatch.boxart?.front) {
        // Get the images base URL and data
        const imagesResponse = await fetch(`${baseUrl}/Games/Images?apikey=${apiKey}&games_id=${bestMatch.id}`)

        if (!imagesResponse.ok) {
          throw new Error(`TheGamesDB Images API error: ${imagesResponse.status}`)
        }

        const imagesData: TheGamesDBImageData = await imagesResponse.json()

        if (imagesData.data && imagesData.data[bestMatch.id.toString()]) {
          const gameImages = imagesData.data[bestMatch.id.toString()]

          // Look for boxart front images
          if (gameImages.boxart) {
            const frontBoxart = gameImages.boxart.find((img) => img.filename.includes("front"))
            if (frontBoxart) {
              return `${imagesData.base_url}/boxart/front/${frontBoxart.filename}`
            }

            // If no specific front boxart, use the first boxart
            if (gameImages.boxart.length > 0) {
              return `${imagesData.base_url}/boxart/front/${gameImages.boxart[0].filename}`
            }
          }

          // If no boxart, try screenshots
          if (gameImages.screenshots && gameImages.screenshots.length > 0) {
            return `${imagesData.base_url}/screenshots/${gameImages.screenshots[0].filename}`
          }
        }
      }
    }

    return ""
  } catch (error) {
    console.error(`Failed to fetch cover from TheGamesDB for ${title}:`, error)
    return ""
  }
}

async function getIGDBAccessToken(clientId: string, clientSecret: string): Promise<string> {
  try {
    const response = await fetch(`https://id.twitch.tv/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    })

    if (!response.ok) {
      throw new Error(`IGDB Auth error: ${response.status}`)
    }

    const data: IGDBAuthResponse = await response.json()
    return data.access_token
  } catch (error) {
    console.error("Failed to get IGDB access token:", error)
    throw error
  }
}

async function fetchGameCoverFromIGDB(
  title: string,
  systemName: string,
  clientId?: string,
  clientSecret?: string,
): Promise<string> {
  if (!clientId || !clientSecret) {
    console.error("IGDB API requires both Client ID and Client Secret")
    return ""
  }

  try {
    // Get access token
    const accessToken = await getIGDBAccessToken(clientId, clientSecret)

    // Get platform IDs for the system
    const platformIds = IGDB_PLATFORM_MAPPING[systemName.toLowerCase()] || []

    // Build the query
    let query = `search "${title}"; fields name,cover.*,platforms; limit 10;`

    // Add platform filter if available
    if (platformIds.length > 0) {
      query += ` where platforms = (${platformIds.join(",")});`
    }

    // Make the API request
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Client-ID": clientId,
        Authorization: `Bearer ${accessToken}`,
      },
      body: query,
    })

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`)
    }

    const games: IGDBGame[] = await response.json()

    if (games && games.length > 0) {
      // Find the best match
      let bestMatch = games[0]

      // Try to find exact title match first
      const exactMatch = games.find((game) => game.name.toLowerCase() === title.toLowerCase())

      if (exactMatch) {
        bestMatch = exactMatch
      } else if (platformIds.length > 0) {
        // Find match with correct platform if specified
        const platformMatch = games.find((game) =>
          game.platforms?.some((platformId) => platformIds.includes(platformId)),
        )
        if (platformMatch) {
          bestMatch = platformMatch
        }
      }

      // If we have a cover, return the image URL
      if (bestMatch.cover?.image_id) {
        // IGDB image URL format: https://images.igdb.com/igdb/image/upload/t_cover_big/{image_id}.jpg
        return `https://images.igdb.com/igdb/image/upload/t_cover_big/${bestMatch.cover.image_id}.jpg`
      }
    }

    return ""
  } catch (error) {
    console.error(`Failed to fetch cover from IGDB for ${title}:`, error)
    return ""
  }
}

export default function GameCoverResolver() {
  const [inputJson, setInputJson] = useState(`[
    {
        "title": "Luigi's Mansion",
        "systemName": "Nintendo GameCube"
    },
    {
        "title": "Animal Crossing",
        "systemName": "Nintendo GameCube"
    },
    {
        "title": "Super Mario Sunshine",
        "systemName": "Nintendo GameCube"
    },
    {
        "title": "The Legend of Zelda: Wind Waker",
        "systemName": "Nintendo GameCube"
    },
    {
        "title": "Luigi's Mansion: Dark Moon",
        "systemName": "Nintendo 3DS"
    },
    {
        "title": "The Legend of Zelda: Majora's Mask 3D",
        "systemName": "Nintendo 3DS"
    }
]`)

  const [outputJson, setOutputJson] = useState<GameItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [rawgApiKey, setRawgApiKey] = useState("")
  const [tgdbApiKey, setTgdbApiKey] = useState("")
  const [igdbClientId, setIgdbClientId] = useState("")
  const [igdbClientSecret, setIgdbClientSecret] = useState("")
  const [showRawgApiKey, setShowRawgApiKey] = useState(false)
  const [showTgdbApiKey, setShowTgdbApiKey] = useState(false)
  const [showIgdbClientId, setShowIgdbClientId] = useState(false)
  const [showIgdbClientSecret, setShowIgdbClientSecret] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [activeApi, setActiveApi] = useState<ApiType>("rawg")
  const { toast } = useToast()

  const processGames = async () => {
    setError("")
    setIsProcessing(true)
    setProcessedCount(0)

    // Check API key requirements
    if (activeApi === "thegamesdb" && !tgdbApiKey) {
      setError("TheGamesDB API requires an API key")
      toast({
        title: "API Key Required",
        description: "TheGamesDB API requires an API key to function.",
        variant: "destructive",
      })
      setIsProcessing(false)
      return
    }

    if (activeApi === "igdb" && (!igdbClientId || !igdbClientSecret)) {
      setError("IGDB API requires both Client ID and Client Secret")
      toast({
        title: "API Credentials Required",
        description: "IGDB API requires both Client ID and Client Secret to function.",
        variant: "destructive",
      })
      setIsProcessing(false)
      return
    }

    try {
      // Parse input JSON
      const games: GameItem[] = JSON.parse(inputJson)

      if (!Array.isArray(games)) {
        throw new Error("Input must be an array of games")
      }

      // Validate structure
      for (const game of games) {
        if (!game.title || !game.systemName) {
          throw new Error("Each game must have 'title' and 'systemName' properties")
        }
      }

      setTotalCount(games.length)

      // Process games with rate limiting
      const gamesWithCovers: GameItem[] = []

      for (let i = 0; i < games.length; i++) {
        const game = games[i]

        try {
          let imageUrl = ""

          if (activeApi === "rawg") {
            imageUrl = await fetchGameCoverFromRAWG(game.title, game.systemName, rawgApiKey || undefined)
          } else if (activeApi === "thegamesdb") {
            imageUrl = await fetchGameCoverFromTheGamesDB(game.title, game.systemName, tgdbApiKey)
          } else if (activeApi === "igdb") {
            imageUrl = await fetchGameCoverFromIGDB(game.title, game.systemName, igdbClientId, igdbClientSecret)
          }

          gamesWithCovers.push({
            ...game,
            imageUrl: imageUrl || undefined,
          })

          setProcessedCount(i + 1)

          // Rate limiting: wait between requests
          // Different APIs have different rate limits
          if (i < games.length - 1) {
            const delay = activeApi === "igdb" ? 250 : 1000 // IGDB allows more requests per second
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
        } catch (error) {
          console.error(`Failed to fetch cover for ${game.title}:`, error)
          gamesWithCovers.push({ ...game })
        }
      }

      setOutputJson(gamesWithCovers)

      const successCount = gamesWithCovers.filter((g) => g.imageUrl).length
      toast({
        title: "Processing Complete!",
        description: `Found covers for ${successCount} out of ${gamesWithCovers.length} games.`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Invalid JSON format"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProcessedCount(0)
      setTotalCount(0)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(outputJson, null, 2))
      setCopied(true)
      toast({
        title: "Copied!",
        description: "JSON copied to clipboard successfully.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      })
    }
  }

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(outputJson, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "games-with-covers.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const progressPercentage = totalCount > 0 ? (processedCount / totalCount) * 100 : 0

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Game Cover Resolver</h1>
        <p className="text-muted-foreground">
          Add real cover images to your game collection JSON using game database APIs.
        </p>
      </div>

      {/* API Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select API Source</CardTitle>
          <CardDescription>Choose which game database API to use for fetching cover images</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rawg" onValueChange={(value) => setActiveApi(value as ApiType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="rawg">RAWG</TabsTrigger>
              <TabsTrigger value="thegamesdb">TheGamesDB</TabsTrigger>
              <TabsTrigger value="igdb">IGDB</TabsTrigger>
            </TabsList>

            {/* RAWG Tab */}
            <TabsContent value="rawg" className="mt-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm">
                    RAWG is the largest video game database with 500,000+ games. Works without an API key (limited to 1
                    request per second) or with a free API key (20,000 requests per month).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rawg-api-key">RAWG API Key (Optional)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="rawg-api-key"
                        type={showRawgApiKey ? "text" : "password"}
                        value={rawgApiKey}
                        onChange={(e) => setRawgApiKey(e.target.value)}
                        placeholder="Enter your RAWG API key..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowRawgApiKey(!showRawgApiKey)}
                      >
                        {showRawgApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get a free API key at{" "}
                    <a
                      href="https://rawg.io/apidocs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      rawg.io/apidocs
                    </a>
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* TheGamesDB Tab */}
            <TabsContent value="thegamesdb" className="mt-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm">
                    TheGamesDB is a community-driven game database with excellent retro game coverage. API key required.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tgdb-api-key">TheGamesDB API Key (Required)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="tgdb-api-key"
                        type={showTgdbApiKey ? "text" : "password"}
                        value={tgdbApiKey}
                        onChange={(e) => setTgdbApiKey(e.target.value)}
                        placeholder="Enter your TheGamesDB API key..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowTgdbApiKey(!showTgdbApiKey)}
                      >
                        {showTgdbApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get a free API key at{" "}
                    <a
                      href="https://thegamesdb.net/api-key.php"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      thegamesdb.net/api-key.php
                    </a>
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* IGDB Tab */}
            <TabsContent value="igdb" className="mt-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm">
                    IGDB (Internet Game Database) offers high-quality cover images and comprehensive game data. Requires
                    Twitch Developer credentials.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="igdb-client-id">Client ID (Required)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1">
                              <Info className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-80 text-xs">
                              Get your Client ID from the Twitch Developer Console. You'll need to register an
                              application.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="relative">
                      <Input
                        id="igdb-client-id"
                        type={showIgdbClientId ? "text" : "password"}
                        value={igdbClientId}
                        onChange={(e) => setIgdbClientId(e.target.value)}
                        placeholder="Enter your IGDB Client ID..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowIgdbClientId(!showIgdbClientId)}
                      >
                        {showIgdbClientId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="igdb-client-secret">Client Secret (Required)</Label>
                    <div className="relative">
                      <Input
                        id="igdb-client-secret"
                        type={showIgdbClientSecret ? "text" : "password"}
                        value={igdbClientSecret}
                        onChange={(e) => setIgdbClientSecret(e.target.value)}
                        placeholder="Enter your IGDB Client Secret..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowIgdbClientSecret(!showIgdbClientSecret)}
                      >
                        {showIgdbClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Get your credentials at{" "}
                    <a
                      href="https://dev.twitch.tv/console/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      dev.twitch.tv/console/apps
                    </a>
                    . Register an application and enable the IGDB API.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Input JSON</CardTitle>
            <CardDescription>
              Paste your game collection JSON here. Each game should have 'title' and 'systemName' properties.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              placeholder="Paste your JSON here..."
              className="min-h-[400px] font-mono text-sm"
            />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing games...</span>
                  <span>
                    {processedCount}/{totalCount}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}

            <Button onClick={processGames} disabled={isProcessing || !inputJson.trim()} className="w-full">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Games... ({processedCount}/{totalCount})
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Process Games with{" "}
                  {activeApi === "rawg" ? "RAWG" : activeApi === "thegamesdb" ? "TheGamesDB" : "IGDB"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader>
            <CardTitle>Enhanced JSON</CardTitle>
            <CardDescription>
              Your games with added imageUrl properties from{" "}
              {activeApi === "rawg" ? "RAWG" : activeApi === "thegamesdb" ? "TheGamesDB" : "IGDB"} database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {outputJson.length > 0 ? (
              <>
                <div className="flex gap-2">
                  <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                    {copied ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                  <Button onClick={downloadJson} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>

                <Textarea
                  value={JSON.stringify(outputJson, null, 2)}
                  readOnly
                  className="min-h-[400px] font-mono text-sm"
                />

                {/* Preview Section */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Preview</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">
                    {outputJson.slice(0, 6).map((game, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                        {game.imageUrl ? (
                          <img
                            src={game.imageUrl || "/placeholder.svg"}
                            alt={game.title}
                            className="w-12 h-16 object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg?height=64&width=48&text=No+Image"
                            }}
                          />
                        ) : (
                          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            No Image
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{game.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{game.systemName}</p>
                        </div>
                      </div>
                    ))}
                    {outputJson.length > 6 && (
                      <div className="flex items-center justify-center p-3 border rounded-lg border-dashed">
                        <p className="text-sm text-muted-foreground">+{outputJson.length - 6} more games</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="min-h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="mb-2">No processed games yet</p>
                  <p className="text-sm">Process your input JSON to see results here</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Select your preferred game database API (RAWG, TheGamesDB, or IGDB)</li>
            <li>
              {activeApi === "rawg"
                ? "Optionally add your RAWG API key for better rate limits"
                : activeApi === "thegamesdb"
                  ? "Add your TheGamesDB API key (required)"
                  : "Add your IGDB Client ID and Client Secret (required)"}
            </li>
            <li>Paste your JSON array in the input field (each game needs 'title' and 'systemName')</li>
            <li>Click "Process Games" to fetch real cover images</li>
            <li>Review the enhanced JSON with imageUrl properties added</li>
            <li>Copy to clipboard or download the result</li>
          </ol>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">About the APIs:</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>RAWG:</strong> Largest video game database with 500,000+ games. Works without an API key
                (limited to 1 request per second) or with a free API key (20,000 requests per month).
              </p>
              <p>
                <strong>TheGamesDB:</strong> Community-driven game database with excellent retro game coverage. Requires
                an API key but offers great results for older and obscure titles.
              </p>
              <p>
                <strong>IGDB:</strong> Professional game database with high-quality cover images and comprehensive data.
                Requires Twitch Developer credentials (Client ID and Client Secret).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
