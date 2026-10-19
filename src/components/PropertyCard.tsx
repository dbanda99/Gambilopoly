import { X } from "lucide-react";
import { BOARD, TOKENS } from "../engine/boardData";
import { rentFor } from "../engine/rules";
import type { GameState } from "../engine/types";
export default function PropertyCard({
  id,
  state,
  onClose,
}: {
  id: number;
  state: GameState;
  onClose: () => void;
}) {
  const tile = BOARD[id],
    owner = state.players.find((p) => p.id === state.properties[id]?.ownerId);
  return (
    <div className="modal-shade" onClick={onClose}>
      <section
        className="property-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-title"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTopColor: tile.color ?? "#e3a05f" }}
      >
        <button className="close" onClick={onClose} aria-label="Close property">
          <X />
        </button>
        <span className="eyebrow">
          SPACE {id} · {tile.type}
        </span>
        <h2 id="property-title">{tile.name}</h2>
        <p>
          {owner
            ? `${TOKENS[owner.token].icon} Owned by ${owner.name}`
            : tile.price
              ? "Available to purchase when you land here."
              : "A little twist in your journey around the neighborhood."}
        </p>
        {tile.price && (
          <dl>
            <div>
              <dt>Purchase price</dt>
              <dd>${tile.price}</dd>
            </div>
            <div>
              <dt>{owner ? "Current rent" : "Base rent"}</dt>
              <dd>
                ${owner ? rentFor(state, id) : tile.rent?.[0]}
                {tile.type === "utility" ? " × dice" : ""}
              </dd>
            </div>
            {tile.group && (
              <div>
                <dt>Property set</dt>
                <dd>{tile.group}</dd>
              </div>
            )}
          </dl>
        )}
        <button className="secondary" onClick={onClose}>
          Back to the board
        </button>
      </section>
    </div>
  );
}
