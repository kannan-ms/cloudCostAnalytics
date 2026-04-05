import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, verifyOtp, resendOtp } from '../../services/authService';
import { Eye, EyeOff, LayoutDashboard, Check, ArrowRight, Mail } from 'lucide-react';

function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (formData.name.length < 2) return 'Name must be at least 2 characters';
    if (!formData.email.includes('@')) return 'Please enter a valid email';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
        setError(validationError);
        return;
    }

    setLoading(true);

    try {
      const response = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.confirmPassword
      );

      if (response.user_id) {
        setRegisteredEmail(response.email || formData.email);
        setStep(2);
      }
    } catch (err) {
       setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await verifyOtp(registeredEmail, otp);
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await resendOtp(registeredEmail);
      setError('');
      alert('A new code has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      {/* Top-left branding */}
      <div className="absolute top-6 left-8 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
          <LayoutDashboard className="w-[18px] h-[18px] text-white" />
        </div>
        <span className="text-[17px] font-semibold text-slate-900 tracking-tight">CloudInsight</span>
      </div>

      <div className="w-full max-w-[480px] bg-white rounded-xl shadow-lg px-8 py-10 mx-4">
          
          {error && (
            <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {step === 1 ? (
            <>
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-slate-900">
                  Create your account
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Get started with your free 30-day trial. No credit card required.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                    Full Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue sm:text-sm transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue sm:text-sm transition-colors"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                        Password
                    </label>
                    <div className="relative mt-1">
                        <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue sm:text-sm transition-colors"
                        placeholder="Min 8 chars"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowPassword(!showPassword)}
                            >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                    </div>

                    <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                        Confirm Password
                    </label>
                    <div className="relative mt-1">
                        <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue sm:text-sm transition-colors"
                        placeholder="Repeat password"
                        />
                    </div>
                    </div>
                </div>

                <div className="flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id="terms"
                          name="terms"
                          type="checkbox"
                          required
                          onInvalid={(e) => e.target.setCustomValidity('Please accept the Terms and Conditions to continue.')}
                          onInput={(e) => e.target.setCustomValidity('')}
                          className="h-4 w-4 rounded border-slate-300 text-primary-blue focus:ring-primary-blue"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="terms" className="font-medium text-slate-700">
                          I agree to the{' '}
                          <button type="button" className="text-primary-blue hover:text-blue-700 underline" onClick={() => setShowTerms(true)}>
                            Terms
                          </button>{' '}
                          and{' '}
                          <button type="button" className="text-primary-blue hover:text-blue-700 underline" onClick={() => setShowPrivacy(true)}>
                            Privacy Policy
                          </button>
                        </label>
                      </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center rounded-lg bg-primary-blue px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue transition-colors disabled:opacity-70 disabled:cursor-not-allowed items-center gap-2"
                  >
                    {loading ? 'Creating account...' : (
                        <>
                        Create Account <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 text-center text-sm text-slate-600">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-primary-blue hover:text-blue-700">
                    Sign in
                  </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mb-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                  <Mail size={32} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">
                  Check your email
                </h2>
                <p className="mt-4 text-sm text-slate-600 max-w-sm">
                  We sent a 6-digit confirmation code to <strong>{registeredEmail}</strong>. 
                  Please enter it below to verify your email.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-slate-700 text-center mb-2">
                    Enter Verification Code
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/[^0-9]/g, ''));
                      setError('');
                    }}
                    className="block w-full max-w-[200px] mx-auto text-center text-2xl tracking-widest rounded-lg border border-slate-300 px-4 py-3 shadow-sm focus:border-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue transition-colors font-mono"
                    placeholder="000000"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="flex w-full justify-center rounded-lg bg-primary-blue px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue transition-colors disabled:opacity-70 disabled:cursor-not-allowed items-center gap-2"
                  >
                    {loading ? 'Verifying...' : (
                        <>
                        Verify Account <Check className="w-4 h-4" />
                        </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 text-center text-sm text-slate-600">
                  Didn't receive the email?{' '}
                  <button 
                    onClick={handleResendOtp} 
                    disabled={loading}
                    className="font-semibold text-primary-blue hover:text-blue-700 disabled:opacity-70"
                  >
                    Resend code
                  </button>
              </div>
            </>
          )}
      </div>

      {/* Terms modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Terms of Service</h3>
              <button onClick={() => setShowTerms(false)} className="text-slate-500 hover:text-slate-700">×</button>
            </div>
            <div className="space-y-3 text-sm text-slate-700 max-h-80 overflow-y-auto">
              <p>1. You confirm that the information provided is accurate and that you have the right to create this account.</p>
              <p>2. You will use the service in compliance with applicable laws and avoid abusive or unauthorized access.</p>
              <p>3. Charges and cost insights are estimates; always verify with your cloud provider for authoritative billing.</p>
              <p>4. We may update these terms as the product evolves; continued use means you accept the latest version.</p>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowTerms(false)} className="rounded-md bg-primary-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Privacy Policy</h3>
              <button onClick={() => setShowPrivacy(false)} className="text-slate-500 hover:text-slate-700">×</button>
            </div>
            <div className="space-y-3 text-sm text-slate-700 max-h-80 overflow-y-auto">
              <p>1. We collect your name, email, and login details to create and secure your account.</p>
              <p>2. Usage data helps improve forecasts and anomaly detection; we do not sell your personal data.</p>
              <p>3. You can request deletion of your account data by contacting support; backups may retain data for a limited period.</p>
              <p>4. We use industry-standard safeguards, but no system is 100% secure; keep your credentials private.</p>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowPrivacy(false)} className="rounded-md bg-primary-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;

