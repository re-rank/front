import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

export function Home() {
  const { user, getRole } = useAuthStore();
  const role = getRole();

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary-50 to-warm-50">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold text-warm-900 mb-6">
            검증된 데이터로<br />
            <span className="text-primary-600">스타트업</span>과 <span className="text-primary-600">투자자</span>를 연결합니다
          </h1>
          <p className="text-xl text-warm-600 mb-10 max-w-2xl mx-auto">
            Stripe, GA4 연동을 통한 실시간 비즈니스 지표 검증으로
            신뢰할 수 있는 투자 의사결정을 지원합니다.
          </p>

          {user ? (
            <div className="flex gap-4 justify-center">
              {role === 'investor' && (
                <Link to="/companies">
                  <Button size="lg">스타트업 탐색하기</Button>
                </Link>
              )}
              {role === 'startup' && (
                <>
                  <Link to="/company/register">
                    <Button size="lg">등록하기</Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button size="lg" variant="outline">대시보드로 이동</Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link to="/register?role=startup">
                <Button size="lg">스타트업으로 시작</Button>
              </Link>
              <Link to="/register?role=investor">
                <Button size="lg" variant="outline">투자자로 시작</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-warm-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-warm-900 mb-12">
            왜 FundBridge인가요?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">검증된 데이터</h3>
              <p className="text-warm-600">
                Stripe, GA4 API 연동으로 자동 수집된 실시간 비즈니스 지표
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">열람 권한 제어</h3>
              <p className="text-warm-600">
                민감한 기업 정보는 인증된 투자자에게만 공개
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">월간 업데이트</h3>
              <p className="text-warm-600">
                정기적인 데이터 제출로 최신 상태 유지
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
