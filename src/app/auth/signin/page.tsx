'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [firmName, setFirmName] = useState('')
  const [role, setRole] = useState('PARALEGAL')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [otp, setOtp] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  
  const router = useRouter()

  const DEFAULT_EMAIL = 'admin@patentflow.com'
  const DEFAULT_PASSWORD = 'admin123'

  const restoreDefaultAdmin = async () => {
    const response = await fetch('/api/auth/restore-admin', { method: 'POST' })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.error || 'Could not reset the default admin account')
    }
  }

  const doSignIn = async (
    emailValue: string,
    passwordValue: string,
    otpValue?: string
  ) => {
    setIsLoading(true)
    setError('')

    const trimmedOtp = otpValue?.trim()

    try {
      let result = await signIn('credentials', {
        email: emailValue,
        password: passwordValue,
        ...(trimmedOtp ? { otp: trimmedOtp } : {}),
        redirect: false,
      })

      if (result?.error && emailValue === DEFAULT_EMAIL) {
        try {
          await restoreDefaultAdmin()
          result = await signIn('credentials', {
            email: emailValue,
            password: passwordValue,
            redirect: false,
          })
        } catch (resetError) {
          setError(
            (resetError as Error).message ||
              'Login failed. Could not restore the default admin account.'
          )
        }
      }

      if (result?.error) {
        setError('Invalid email or password. If you are using the demo admin, try the quick login button below to auto-fix credentials.')
      } else if (result?.ok) {
        router.push('/dashboard')
      }
    } catch (error) {
      setError('Sign in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    return doSignIn(email, password, otp)
  }

  const prefillDefault = () => {
    setEmail(DEFAULT_EMAIL)
    setPassword(DEFAULT_PASSWORD)
    setOtp('')
    setError('')
  }

  const handleQuickLogin = () => doSignIn(DEFAULT_EMAIL, DEFAULT_PASSWORD)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRegistering(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          firmName,
          role,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMfaSecret(data.user.twoFactorSecret)
        setBackupCodes(data.user.backupCodes || [])
        setError('')
        setIsRegistering(false)
        return
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      setError('Registration failed. Please try again.')
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md p-4">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              PatentFlow Enterprise
            </CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-otp">One-time code</Label>
                    <Input
                      id="signin-otp"
                      type="text"
                      placeholder="6-digit TOTP or backup code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank unless multi-factor authentication is enabled on your account.
                    </p>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                    onClick={() => {
                      prefillDefault()
                      handleQuickLogin()
                    }}
                  >
                    Use default admin (local demo)
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-firm">Firm Name (Optional)</Label>
                    <Input
                      id="register-firm"
                      type="text"
                      placeholder="Your firm or organization name"
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-role">Role</Label>
                    <select
                      id="register-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="PARALEGAL">Paralegal</option>
                      <option value="ATTORNEY">Attorney</option>
                      <option value="REVIEWER">Reviewer</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isRegistering}
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
                {(mfaSecret || backupCodes.length > 0) && (
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">Multi-factor authentication required</p>
                        {mfaSecret && (
                          <p className="break-words text-sm">
                            Add this secret to your authenticator app: <strong>{mfaSecret}</strong>
                          </p>
                        )}
                        {backupCodes.length > 0 && (
                          <div>
                            <p className="text-sm">Backup codes (store securely):</p>
                            <ul className="list-disc pl-5 text-sm">
                              {backupCodes.map((code) => (
                                <li key={code}>{code}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Use the one-time code from your authenticator to sign in above. Keep backup codes offline.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}