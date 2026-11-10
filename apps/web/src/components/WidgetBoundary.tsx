'use client';
import { Component, type ReactNode } from 'react';
import { RotateCcw, SignalZero } from 'lucide-react';
import { translate } from '@/lib/i18n';
import { useMissionStore } from '@/lib/store/missionStore';

interface Props {
  name: string;
  children: ReactNode;
  className?: string;
}
interface State {
  failed: boolean;
}

/** Contains a crash to one widget: the rest of Mission Control keeps running. */
export class WidgetBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    console.error(`[widget:${this.props.name}]`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const locale = useMissionStore.getState().locale;
    return (
      <div role="alert" className={`card flex flex-col items-start justify-center gap-2 bg-cell p-4 ${this.props.className ?? ''}`}>
        <SignalZero className="size-5 text-amber" aria-hidden />
        <p className="text-sm font-medium">{translate(locale, 'widget.offline')}</p>
        <p className="text-xs text-mist">{this.props.name}</p>
        <button
          onClick={() => this.setState({ failed: false })}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-teal/15 px-3 py-1.5 text-sm text-teal hover:bg-teal/25"
        >
          <RotateCcw className="size-3.5" aria-hidden /> {translate(locale, 'widget.reconnect')}
        </button>
      </div>
    );
  }
}
