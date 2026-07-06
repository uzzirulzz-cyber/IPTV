'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/store/app-store'
import {
  Users,
  Heart,
  Clock,
  Server,
  Database,
  Settings2,
  Tv,
  CheckCircle2,
  XCircle,
  LogOut,
  RefreshCw,
  Trash2,
  Globe,
  Lock,
  Activity,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

interface AdminStats {
  stats: { userCount: number; favoriteCount: number; historyCount: number }
  users: { id: string; email: string; name: string | null; avatar: string | null; createdAt: string }[]
}

interface IptvConfig {
  health: {
    ok: boolean
    error?: string
    user_info?: {
      username: string
      status: string
      exp_date: string | null
      active_cons: string
      max_connections: string
      is_trial: string
      created_at: string
    }
    server_info?: {
      url: string
      port: string
      https_port: string
      server_protocol: string
      rtmp_port: string
      timezone: string
      time_now: string
    }
  }
  categories: { category_id: string; category_name: string }[]
  totalCategories: number
  iptv: { url: string; username: string; hasPassword: boolean }
  mongo: {
    full: string
    masked: string
    protocol: string
    cluster: string
    appName: string
    database: string
  } | null
  streaming: {
    format: string
    lowLatency: boolean
    bufferSize: number
    hlsVersion: string
    recovery: string
  }
}

function formatDate(ts: string | null | number): string {
  if (!ts) return '—'
  const num = typeof ts === 'string' ? parseInt(ts, 10) : ts
  if (isNaN(num)) return '—'
  return new Date(num * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function AdminDashboard() {
  const { setView } = useAppStore()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [config, setConfig] = useState<IptvConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load stats')
      const data = await res.json()
      setStats(data)
    } catch {
      toast.error('Failed to load admin stats')
    }
  }

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/iptv-config', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load IPTV config')
      const data = await res.json()
      setConfig(data)
    } catch {
      toast.error('Failed to load IPTV configuration')
    }
  }

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadStats(), loadConfig()])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    toast.success('Refreshed')
    setRefreshing(false)
  }

  const handleSignOut = async () => {
    await fetch('/api/admin/signout', { method: 'POST' })
    toast.success('Signed out of admin')
    setView('home')
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This will also remove their favorites and watch history.`)) return
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete user')
      toast.success(`User ${email} deleted`)
      loadStats()
    } catch {
      toast.error('Failed to delete user')
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage Playbeat Digital configuration and users</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-rose-400">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto lg:grid-flow-col">
            <TabsTrigger value="overview" className="gap-1.5">
              <Activity className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="server" className="gap-1.5">
              <Server className="h-4 w-4" /> Server
            </TabsTrigger>
            <TabsTrigger value="iptv" className="gap-1.5">
              <Settings2 className="h-4 w-4" /> IPTV Config
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-rose-400" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{stats?.stats.userCount ?? 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Favorites Saved</CardTitle>
                  <Heart className="h-4 w-4 text-rose-400" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{stats?.stats.favoriteCount ?? 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">Across all users</p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Watch Events</CardTitle>
                  <Clock className="h-4 w-4 text-rose-400" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-3xl font-bold">{stats?.stats.historyCount ?? 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">Total watch records</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* IPTV status banner */}
            <Card className="mt-4 border-border/40">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${config?.health.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {config?.health.ok ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">IPTV Service Status</h3>
                    {loading ? (
                      <Skeleton className="h-4 w-48 mt-2" />
                    ) : config?.health.ok ? (
                      <>
                        <p className="text-sm text-emerald-400 mt-1">Connected and streaming</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                          <div>
                            <div className="text-muted-foreground">Status</div>
                            <div className="font-medium">{config.health.user_info?.status || 'Active'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Connections</div>
                            <div className="font-medium">{config.health.user_info?.active_cons || '0'}/{config.health.user_info?.max_connections || '—'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Expires</div>
                            <div className="font-medium">{formatDate(config.health.user_info?.exp_date || null)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Categories</div>
                            <div className="font-medium">{config.totalCategories}</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-rose-400 mt-1">{config?.health.error || 'Service unreachable'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-rose-400" />
                  Registered Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !stats?.users || stats.users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No users registered yet</p>
                ) : (
                  <ScrollArea className="max-h-[60vh]">
                    <div className="space-y-2">
                      {stats.users.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40 bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 text-sm font-medium">
                              {(u.name || u.email)[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{u.name || u.email.split('@')[0]}</div>
                              <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="hidden sm:inline-flex">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Server Tab */}
          <TabsContent value="server">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-rose-400" />
                  IPTV Server Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading || !config ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : config.health.ok && config.health.server_info ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Server URL</span>
                        </div>
                        <span className="text-sm font-medium font-mono">{config.health.server_info.url}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">HTTP Port</span>
                        </div>
                        <span className="text-sm font-medium font-mono">{config.health.server_info.port}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">HTTPS Port</span>
                        </div>
                        <span className="text-sm font-medium font-mono">{config.health.server_info.https_port}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">RTMP Port</span>
                        </div>
                        <span className="text-sm font-medium font-mono">{config.health.server_info.rtmp_port}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Protocol</span>
                        </div>
                        <span className="text-sm font-medium uppercase">{config.health.server_info.server_protocol}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Timezone</span>
                        </div>
                        <span className="text-sm font-medium">{config.health.server_info.timezone}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Server Time</span>
                        </div>
                        <span className="text-sm font-medium">{config.health.server_info.time_now}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Active Connections</span>
                        </div>
                        <span className="text-sm font-medium">
                          {config.health.user_info?.active_cons || '0'} / {config.health.user_info?.max_connections || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <XCircle className="h-10 w-10 text-rose-400 mb-3" />
                    <p className="text-sm font-medium">Server unreachable</p>
                    <p className="text-xs text-muted-foreground mt-1">{config.health.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* IPTV Config Tab */}
          <TabsContent value="iptv">
            <div className="space-y-4">
              {/* Streaming config */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tv className="h-5 w-5 text-rose-400" />
                    Streaming Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || !config ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Stream Format</div>
                        <div className="text-sm font-medium mt-1">{config.streaming.format}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">HLS.js Version</div>
                        <div className="text-sm font-medium mt-1 font-mono">v{config.streaming.hlsVersion}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Low Latency Mode</div>
                        <div className="text-sm font-medium mt-1">
                          <Badge variant={config.streaming.lowLatency ? 'default' : 'secondary'}>
                            {config.streaming.lowLatency ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Buffer Size</div>
                        <div className="text-sm font-medium mt-1">{config.streaming.bufferSize}s</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 md:col-span-2">
                        <div className="text-xs text-muted-foreground">Error Recovery</div>
                        <div className="text-sm font-medium mt-1">{config.streaming.recovery}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Database Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-rose-400" />
                    Database Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || !config ? (
                    <Skeleton className="h-32" />
                  ) : config.mongo ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground">Provider</div>
                          <div className="text-sm font-medium mt-1">MongoDB Atlas</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground">Protocol</div>
                          <div className="text-sm font-medium mt-1">{config.mongo.protocol}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground">Cluster</div>
                          <div className="text-sm font-medium mt-1 font-mono">{config.mongo.cluster}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground">Database</div>
                          <div className="text-sm font-medium mt-1 font-mono">{config.mongo.database}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 md:col-span-2">
                          <div className="text-xs text-muted-foreground">App Name</div>
                          <div className="text-sm font-medium mt-1 font-mono">{config.mongo.appName}</div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Connection String (masked)
                        </div>
                        <div className="text-xs font-mono mt-1 break-all text-rose-400">{config.mongo.masked}</div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Credentials are stored securely as environment variables and never exposed in the client.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">MongoDB not configured</p>
                  )}
                </CardContent>
              </Card>

              {/* IPTV Credentials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-rose-400" />
                    IPTV Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || !config ? (
                    <Skeleton className="h-20" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Server URL</div>
                        <div className="text-sm font-medium mt-1 font-mono">{config.iptv.url}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Username</div>
                        <div className="text-sm font-medium mt-1 font-mono">{config.iptv.username}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Password</div>
                        <div className="text-sm font-medium mt-1">
                          <Badge variant={config.iptv.hasPassword ? 'default' : 'secondary'}>
                            {config.iptv.hasPassword ? 'Configured' : 'Missing'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Categories list */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tv className="h-5 w-5 text-rose-400" />
                    Channel Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || !config ? (
                    <Skeleton className="h-40" />
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-3">{config.totalCategories} categories available</p>
                      <ScrollArea className="max-h-60">
                        <div className="flex flex-wrap gap-2">
                          {config.categories.map((cat) => (
                            <Badge key={cat.category_id} variant="outline" className="font-normal">
                              {cat.category_name}
                            </Badge>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
