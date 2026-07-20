import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { loginMagicLinkSchema, type LoginMagicLinkInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

export function LoginPage() {
  const { session, signInWithMagicLink } = useAuth()
  const [magicSent, setMagicSent] = useState(false)

  const magicForm = useForm<LoginMagicLinkInput>({
    resolver: zodResolver(loginMagicLinkSchema),
    defaultValues: { email: '' },
  })

  if (session) return <Navigate to="/" replace />

  const onMagicSubmit = magicForm.handleSubmit(async (values) => {
    const { error } = await signInWithMagicLink(values.email)
    if (error) toast.error(error)
    else {
      setMagicSent(true)
      toast.success('Check your email for the magic link')
    }
  })

  return (
    <div className="wedding-bg flex min-h-dvh items-center justify-center px-4">
      <Card className="wedding-surface w-full max-w-[430px] border-gold/45 shadow-[0_0_48px_rgba(212,168,83,0.16)]">
        <CardHeader>
          <CardTitle className="font-display text-3xl tracking-wide text-gold drop-shadow-sm">Shadi Prabandhak</CardTitle>
          <CardDescription className="text-base text-white/85">
            Enter your email to receive a sign-in link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {magicSent ? (
            <p className="text-sm text-muted-foreground">
              We sent a link to your email. Click it to sign in.
            </p>
          ) : (
            <Form {...magicForm}>
              <form onSubmit={onMagicSubmit} className="space-y-4">
                <FormField
                  control={magicForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={magicForm.formState.isSubmitting}>
                  {magicForm.formState.isSubmitting ? 'Sending…' : 'Send magic link'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
