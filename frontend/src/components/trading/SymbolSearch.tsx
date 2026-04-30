import { useRef, useState } from "react";
import { useMarketSymbols } from "../../hooks/useMarketSymbols";

type Props = {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
};

export default function SymbolSearch({
  selectedSymbol,
  onSelectSymbol,
}: Props) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const {
    visibleSymbols,
    query,
    setQuery,
    loadingSymbols,
    symbolsError,
    loadMoreVisibleSymbols,
    hasMoreSymbols,
    totalSymbols,
  } = useMarketSymbols();

  const handleScroll = () => {
    if (!listRef.current) return;

    const { scrollTop, clientHeight, scrollHeight } = listRef.current;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 16;

    if (isNearBottom && hasMoreSymbols) {
      loadMoreVisibleSymbols();
    }
  };

  const handleSelect = (symbol: string) => {
    onSelectSymbol(symbol);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          minWidth: 120,
          padding: "4px 8px",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          background: "#fff",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {selectedSymbol}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.35)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 80,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: 760,
              maxWidth: "92vw",
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Symbol search</h2>
                <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
                  Tạm thời search theo symbol. Sau này có thể nâng cấp thuật
                  toán search giống TradingView hơn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 28,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search symbol, ví dụ BTC, ETH, SOL..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: 16,
                  boxSizing: "border-box",
                }}
              />

              <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 13 }}>
                Backend chỉ lấy tối đa 90 symbols. Đang hiện{" "}
                {visibleSymbols.length}/{totalSymbols}. Scroll xuống cuối list
                để hiện thêm 15.
              </p>
            </div>

            {loadingSymbols && (
              <p style={{ padding: "16px 24px" }}>Loading symbols...</p>
            )}

            {symbolsError && (
              <p style={{ padding: "16px 24px", color: "red" }}>
                {symbolsError}
              </p>
            )}

            {!loadingSymbols && !symbolsError && (
              <div
                ref={listRef}
                onScroll={handleScroll}
                style={{
                  maxHeight: 480,
                  overflowY: "auto",
                }}
              >
                {visibleSymbols.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => handleSelect(item.symbol)}
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "160px 1fr 80px",
                      gap: 12,
                      alignItems: "center",
                      padding: "12px 24px",
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      background:
                        item.symbol === selectedSymbol ? "#f3f4f6" : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <strong>{item.symbol}</strong>
                    <span style={{ color: "#374151" }}>
                      {item.baseAsset} / {item.quoteAsset}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: 13 }}>
                      {item.status}
                    </span>
                  </button>
                ))}

                {hasMoreSymbols && (
                  <div
                    style={{
                      padding: 16,
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    Scroll tiếp để hiện thêm symbols...
                  </div>
                )}

                {!hasMoreSymbols && (
                  <div
                    style={{
                      padding: 16,
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    Đã hiện hết danh sách phù hợp.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}