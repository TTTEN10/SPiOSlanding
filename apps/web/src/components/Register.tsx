import Header from './Header'
import Footer from './Footer'
import WaitlistForm from './WaitlistForm'

export default function Register() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1" role="main" aria-label="Register">
        <div className="container-max section-padding py-8 lg:py-12">
          <WaitlistForm title="Register" subtitle="Join the waitlist to get early access and updates." />
        </div>
      </main>
      <Footer />
    </div>
  )
}

