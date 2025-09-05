import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("UI crash:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-200">
          <div className="max-w-lg text-center">
            <div className="text-2xl font-semibold mb-2">Something went wrong</div>
            <div className="text-sm text-zinc-400 mb-4">{String(this.state.error)}</div>
            <button className="btn" onClick={() => location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
