import { X } from "lucide-react";
import { BOARD, TOKENS } from "../engine/boardData";
import { rentFor } from "../engine/rules";
import type { GameState } from "../engine/types";
import {
  buildingCost,
  buildingError,
  buildingSupply,
} from "../engine/buildings";
import { useGame } from "../store";
export default function PropertyCard({
  id,
  state,
  onClose,
  interactionDisabled = false,
}: {
  id: number;
  state: GameState;
  onClose: () => void;
  interactionDisabled?: boolean;
}) {
  const tile = BOARD[id],
    owner = state.players.find((p) => p.id === state.properties[id]?.ownerId);
  const dispatch = useGame((s) => s.dispatch),
    current = state.players[state.currentPlayerIndex],
    level = state.properties[id]?.buildings ?? 0,
    supply = buildingSupply(state);
  const buildError = buildingError(state, current.id, id),
    sellError = buildingError(state, current.id, id, true);
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
        {tile.type === "property" && owner?.id === current.id && (
          <section className="building-actions" aria-label="Manage buildings">
            <p>
              <strong>{level === 5 ? "1 Inn" : `${level} / 4 houses`}</strong> ·
              Bank: {supply.houses} houses, {supply.inns} inns
            </p>
            <button
              className="primary"
              disabled={interactionDisabled || !!buildError}
              title={buildError ?? ""}
              onClick={() =>
                dispatch({ type: "build", playerId: current.id, spaceId: id })
              }
            >
              {level === 4 ? "Upgrade to inn" : "Build a house"} · $
              {buildingCost(id)}
            </button>
            <button
              className="secondary"
              disabled={interactionDisabled || !!sellError}
              title={sellError ?? ""}
              onClick={() =>
                dispatch({
                  type: "sell-building",
                  playerId: current.id,
                  spaceId: id,
                })
              }
            >
              Sell a building · ${buildingCost(id) / 2}
            </button>
            {buildError && <p>{buildError}</p>}
          </section>
        )}
        <button className="secondary" onClick={onClose}>
          Back to the board
        </button>
      </section>
    </div>
  );
}
