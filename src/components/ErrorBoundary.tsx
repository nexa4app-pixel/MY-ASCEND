import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download, RotateCcw } from 'lucide-react';
import { logger } from '../services/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isExporting: boolean;
  exportSuccess: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isExporting: false,
    exportSuccess: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Unhandled React component error caught by ErrorBoundary', 'ErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isExporting: false,
      exportSuccess: false,
    });
  };

  private handleEmergencyExport = async () => {
    this.setState({ isExporting: true, exportSuccess: false });
    try {
      // Dynamically import to avoid circular deps at module load time
      const { exportFullDatabaseJSON } = await import('../services/exportService');
      const blob = await exportFullDatabaseJSON();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ascend-emergency-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.setState({ exportSuccess: true });
    } catch (e) {
      logger.error(`Emergency export failed: ${e}`, 'ErrorBoundary');
      // Fall back to crash report log only
      const crashReport = {
        timestamp: new Date().toISOString(),
        error: {
          message: this.state.error?.message,
          stack: this.state.error?.stack,
        },
        componentStack: this.state.errorInfo?.componentStack,
        recentLogs: logger.getLogs(),
      };
      const blob = new Blob([JSON.stringify(crashReport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ascend-crash-report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      this.setState({ isExporting: false });
    }
  };

  public override render() {
    if (this.state.hasError) {
      const { isExporting, exportSuccess } = this.state;

      return (
        <div className="flex flex-col items-center justify-center min-h-screen h-full p-8 text-center bg-[#f3f3f3] dark:bg-[#1a1a1a]">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-6 shadow-sm border border-red-500/20">
            <AlertTriangle className="w-10 h-10" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-[#1f1f1f] dark:text-white mb-2">
            خطای غیرمنتظره / Unexpected Error
          </h2>
          <p className="text-sm text-[#616161] dark:text-[#adadad] max-w-lg mb-2 leading-relaxed">
            سیستم با یک خطای پیش‌بینی‌نشده مواجه شد. داده‌های شما ایمن است.
            <br />
            An unexpected error occurred. Your data is safe — use the options below to recover.
          </p>

          {/* Error Details Box */}
          <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-4 max-w-xl w-full text-start mb-6 overflow-auto max-h-36 font-mono text-xs text-red-600 dark:text-red-400 select-all">
            {this.state.error?.message || 'Unknown error occurred.'}
            {this.state.errorInfo?.componentStack && (
              <div className="mt-2 text-[10px] text-red-500/70 dark:text-red-400/60 whitespace-pre-wrap">
                {this.state.errorInfo.componentStack.slice(0, 600)}
              </div>
            )}
          </div>

          {/* Export success notice */}
          {exportSuccess && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm font-medium">
              ✓ پشتیبان اضطراری با موفقیت ذخیره شد / Emergency backup exported successfully
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Reload */}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbf] active:bg-[#0060ab] text-white text-sm font-semibold shadow transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              بارگذاری مجدد / Reload App
            </button>

            {/* Emergency JSON Backup */}
            <button
              onClick={this.handleEmergencyExport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-sm font-semibold shadow transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'در حال صادرکردن...' : 'پشتیبان اضطراری / Emergency Backup'}
            </button>

            {/* Reset State */}
            <button
              onClick={this.handleResetState}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-[#1f1f1f] dark:text-white border border-black/10 dark:border-white/10 text-sm font-semibold shadow transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              بازنشانی وضعیت / Reset State
            </button>
          </div>

          {/* Footer note */}
          <p className="mt-8 text-xs text-[#999] dark:text-[#666]">
            MY ASCEND v0.1.0 — Error Boundary Fallback UI
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
