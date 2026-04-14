import React from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Premium Fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-rubber-900/10 border border-gray-100 overflow-hidden transform transition-all">
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-rubber-600 to-rubber-800 p-8 flex flex-col items-center text-white">
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm mb-4 animate-pulse">
                <ShieldAlert size={48} className="text-white" />
              </div>
              <h1 className="text-2xl font-black text-center">ขออภัย เกิดข้อผิดพลาด</h1>
              <p className="text-rubber-100 text-center text-sm mt-2 font-medium">
                ระบบพบปัญหาบางอย่างที่ทำให้ไม่สามารถทำงานต่อได้
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-8">
                <p className="text-xs font-mono text-red-700 break-all leading-relaxed">
                  {this.state.error?.toString() || "Unknown JavaScript Error"}
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center px-6 py-4 bg-rubber-600 hover:bg-rubber-700 text-white rounded-2xl font-black text-lg shadow-lg shadow-rubber-600/30 transition-all active:scale-95 group"
                >
                  <RefreshCw size={24} className="mr-3 group-hover:rotate-180 transition-transform duration-500" />
                  เริ่มการทำงานใหม่
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center px-6 py-4 bg-white border-2 border-gray-200 hover:border-rubber-600 hover:text-rubber-600 text-gray-600 rounded-2xl font-bold transition-all active:scale-95"
                >
                  <Home size={20} className="mr-3" />
                  กลับหน้าแรก
                </button>
              </div>

              <div className="mt-8 text-center">
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">
                  RubberTrade Co., Ltd. • Error Recovery System
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
