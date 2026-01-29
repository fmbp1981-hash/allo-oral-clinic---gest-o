import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  getTrelloBoards,
  getTrelloLists,
  getTrelloCards,
  createTrelloCard,
  updateTrelloCard,
  deleteTrelloCard,
  TrelloBoard,
  TrelloList,
  TrelloCard,
} from '../services/trelloService';

// Form data interface
interface CardFormData {
  name: string;
  desc: string;
}

// Constants
const MAX_CARD_NAME_LENGTH = 100;
const MAX_CARD_DESC_LENGTH = 5000;

export default function TrelloDashboard() {
  // State with proper typing
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [cards, setCards] = useState<TrelloCard[]>([]);

  // Loading states (specific for each operation)
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardActionLoading, setCardActionLoading] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardForm, setCardForm] = useState<CardFormData>({ name: '', desc: '' });
  const [editingCard, setEditingCard] = useState<TrelloCard | null>(null);

  // Memoized filtered cards (avoid filtering on every render)
  const validCards = useMemo(
    () => cards.filter((card) => card && card.name && card.name.trim() !== ''),
    [cards]
  );

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Load boards on mount
  useEffect(() => {
    const loadBoards = async () => {
      try {
        setLoadingBoards(true);
        setError(null);
        const data = await getTrelloBoards();
        setBoards(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar boards';
        setError(message);
        console.error('Failed to load boards:', err);
      } finally {
        setLoadingBoards(false);
      }
    };
    loadBoards();
  }, []);

  // Handle board selection
  const handleBoardSelect = useCallback(async (boardId: string) => {
    if (!boardId) {
      setSelectedBoard(null);
      setLists([]);
      setSelectedList(null);
      setCards([]);
      return;
    }

    try {
      setSelectedBoard(boardId);
      setLoadingLists(true);
      setError(null);
      setSelectedList(null);
      setCards([]);

      const listsData = await getTrelloLists(boardId);
      setLists(listsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar listas';
      setError(message);
      console.error('Failed to load lists:', err);
      setLists([]);
    } finally {
      setLoadingLists(false);
    }
  }, []);

  // Handle list selection
  const handleListSelect = useCallback(async (listId: string) => {
    if (!listId) {
      setSelectedList(null);
      setCards([]);
      return;
    }

    try {
      setSelectedList(listId);
      setLoadingCards(true);
      setError(null);

      const cardsData = await getTrelloCards({ listId });
      setCards(cardsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar cards';
      setError(message);
      console.error('Failed to load cards:', err);
      setCards([]);
    } finally {
      setLoadingCards(false);
    }
  }, []);

  // Open create card form
  const handleOpenCreateCard = useCallback(() => {
    setEditingCard(null);
    setCardForm({ name: '', desc: '' });
    setShowCardForm(true);
  }, []);

  // Open edit card form
  const handleEditCard = useCallback((card: TrelloCard) => {
    setEditingCard(card);
    setCardForm({ name: card.name, desc: card.desc || '' });
    setShowCardForm(true);
  }, []);

  // Delete card with rollback support
  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      if (!window.confirm('Tem certeza que deseja excluir este card?')) return;

      const previousCards = [...cards]; // Backup for rollback

      try {
        setCardActionLoading(true);
        setError(null);
        // Optimistic update
        setCards(cards.filter((c) => c.id !== cardId));

        await deleteTrelloCard(cardId);
      } catch (err) {
        // Rollback on error
        setCards(previousCards);
        const message = err instanceof Error ? err.message : 'Erro ao excluir card';
        setError(message);
        console.error('Failed to delete card:', err);
      } finally {
        setCardActionLoading(false);
      }
    },
    [cards]
  );

  // Submit card form (create or update)
  const handleCardFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!cardForm.name.trim()) {
        setError('O título do card é obrigatório');
        return;
      }

      if (!selectedList && !editingCard) {
        setError('Selecione uma lista primeiro');
        return;
      }

      const previousCards = [...cards]; // Backup for rollback

      try {
        setCardActionLoading(true);
        setError(null);

        if (editingCard) {
          // Update existing card
          const updated = await updateTrelloCard(editingCard.id, {
            name: cardForm.name,
            desc: cardForm.desc,
          });
          setCards(cards.map((c) => (c.id === updated.id ? updated : c)));
        } else {
          // Create new card
          const created = await createTrelloCard({
            name: cardForm.name,
            desc: cardForm.desc,
            listId: selectedList!,
          });
          setCards([created, ...cards]);
        }

        // Success - close form
        setShowCardForm(false);
        setEditingCard(null);
        setCardForm({ name: '', desc: '' });
      } catch (err) {
        // Rollback on error
        setCards(previousCards);
        const message = err instanceof Error ? err.message : 'Erro ao salvar card';
        setError(message);
        console.error('Failed to save card:', err);
      } finally {
        setCardActionLoading(false);
      }
    },
    [cards, cardForm, editingCard, selectedList]
  );

  // Cancel form
  const handleCancelForm = useCallback(() => {
    setShowCardForm(false);
    setEditingCard(null);
    setCardForm({ name: '', desc: '' });
  }, []);

  // Compute overall loading state
  const isLoading = loadingBoards || loadingLists || loadingCards;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Integração Trello</h2>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Board Selection */}
      <div className="mb-4">
        <label className="block mb-2 font-medium">
          Boards:
          {loadingBoards && (
            <span className="ml-2 text-gray-500 text-sm font-normal">Carregando...</span>
          )}
        </label>
        <select
          onChange={(e) => handleBoardSelect(e.target.value)}
          value={selectedBoard || ''}
          className="w-full md:w-auto border rounded px-3 py-2"
          disabled={loadingBoards}
        >
          <option value="">Selecione um board</option>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
      </div>

      {/* List Selection */}
      {selectedBoard && (
        <div className="mb-4">
          <label className="block mb-2 font-medium">
            Listas:
            {loadingLists && (
              <span className="ml-2 text-gray-500 text-sm font-normal">Carregando...</span>
            )}
          </label>
          {lists.length > 0 ? (
            <select
              onChange={(e) => handleListSelect(e.target.value)}
              value={selectedList || ''}
              className="w-full md:w-auto border rounded px-3 py-2"
              disabled={loadingLists}
            >
              <option value="">Selecione uma lista</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          ) : (
            !loadingLists && (
              <p className="text-gray-500 text-sm">Nenhuma lista encontrada neste board</p>
            )
          )}
        </div>
      )}

      {/* New Card Button */}
      {selectedList && (
        <div className="mb-4">
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleOpenCreateCard}
            disabled={cardActionLoading || showCardForm}
          >
            + Novo Card
          </button>
        </div>
      )}

      {/* Card Form */}
      {showCardForm && (
        <form
          className="mb-4 p-4 border rounded bg-gray-50 shadow-sm"
          onSubmit={handleCardFormSubmit}
        >
          <h4 className="font-semibold mb-3 text-lg">
            {editingCard ? 'Editar Card' : 'Novo Card'}
          </h4>

          <div className="mb-3">
            <label className="block mb-1 font-medium">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={cardForm.name}
              onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
              maxLength={MAX_CARD_NAME_LENGTH}
              required
              placeholder="Digite o título do card"
            />
            <span className="text-xs text-gray-500">
              {cardForm.name.length}/{MAX_CARD_NAME_LENGTH}
            </span>
          </div>

          <div className="mb-3">
            <label className="block mb-1 font-medium">Descrição</label>
            <textarea
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={cardForm.desc}
              onChange={(e) => setCardForm({ ...cardForm, desc: e.target.value })}
              maxLength={MAX_CARD_DESC_LENGTH}
              rows={3}
              placeholder="Digite a descrição do card (opcional)"
            />
            <span className="text-xs text-gray-500">
              {cardForm.desc.length}/{MAX_CARD_DESC_LENGTH}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={cardActionLoading || !cardForm.name.trim()}
            >
              {cardActionLoading ? 'Salvando...' : editingCard ? 'Salvar' : 'Criar'}
            </button>
            <button
              type="button"
              className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded disabled:opacity-50"
              onClick={handleCancelForm}
              disabled={cardActionLoading}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Cards List */}
      {selectedList && (
        <div>
          <h3 className="text-xl font-semibold mb-2">
            Cards
            {loadingCards && (
              <span className="ml-2 text-gray-500 text-sm font-normal">Carregando...</span>
            )}
          </h3>

          {validCards.length > 0 ? (
            <ul className="space-y-2">
              {validCards.map((card) => (
                <li
                  key={card.id}
                  className="border p-3 rounded flex justify-between items-start hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{card.name}</div>
                    {card.desc && (
                      <div className="text-gray-600 text-sm mt-1 line-clamp-2">{card.desc}</div>
                    )}
                    {card.url && (
                      <a
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-1 block truncate"
                      >
                        {card.shortUrl || card.url}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <button
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      onClick={() => handleEditCard(card)}
                      disabled={cardActionLoading}
                    >
                      Editar
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      onClick={() => handleDeleteCard(card.id)}
                      disabled={cardActionLoading}
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            !loadingCards && (
              <p className="text-gray-500 text-sm">
                Nenhum card encontrado nesta lista. Clique em &quot;+ Novo Card&quot; para criar um.
              </p>
            )
          )}
        </div>
      )}

      {/* Empty state */}
      {!selectedBoard && !isLoading && boards.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhum board encontrado.</p>
          <p className="text-sm mt-2">
            Verifique se o Trello está configurado corretamente nas Configurações.
          </p>
        </div>
      )}
    </div>
  );
}
