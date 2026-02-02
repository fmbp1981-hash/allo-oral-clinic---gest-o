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
import { createOpportunity, importPatientFromTrello } from '../services/apiService';
import { OpportunityStatus } from '../types';
import { useToast } from '../hooks/useToast';
import { TrelloImportModal } from './TrelloImportModal';
import { ImportTrelloListModal } from './ImportTrelloListModal';

// Form data interface
interface CardFormData {
  name: string;
  desc: string;
}

// Constants
const MAX_CARD_NAME_LENGTH = 100;
const MAX_CARD_DESC_LENGTH = 5000;

export default function TrelloDashboard() {
  const toast = useToast();
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

  // Import state
  const [importedCards, setImportedCards] = useState<Set<string>>(new Set());
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importingCard, setImportingCard] = useState<TrelloCard | null>(null);
  const [importListModalOpen, setImportListModalOpen] = useState(false);

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

  // Clear success message after some time
  useEffect(() => {
    if (importSuccess) {
      const timer = setTimeout(() => setImportSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [importSuccess]);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedBoard = sessionStorage.getItem('trello_selectedBoard');
    const savedList = sessionStorage.getItem('trello_selectedList');

    if (savedBoard) {
      setSelectedBoard(savedBoard);
    }
    if (savedList) {
      setSelectedList(savedList);
    }
  }, []);

  // Save selectedBoard to sessionStorage
  useEffect(() => {
    if (selectedBoard) {
      sessionStorage.setItem('trello_selectedBoard', selectedBoard);
    } else {
      sessionStorage.removeItem('trello_selectedBoard');
    }
  }, [selectedBoard]);

  // Save selectedList to sessionStorage
  useEffect(() => {
    if (selectedList) {
      sessionStorage.setItem('trello_selectedList', selectedList);
    } else {
      sessionStorage.removeItem('trello_selectedList');
    }
  }, [selectedList]);

  // Load boards on mount
  useEffect(() => {
    const loadBoards = async () => {
      try {
        setLoadingBoards(true);
        setError(null);
        const data = await getTrelloBoards();
        setBoards(data);

        // If we have a saved board, load its lists
        const savedBoard = sessionStorage.getItem('trello_selectedBoard');
        if (savedBoard && data.some(b => b.id === savedBoard)) {
          const listsData = await getTrelloLists(savedBoard);
          setLists(listsData);

          // If we have a saved list, load its cards
          const savedList = sessionStorage.getItem('trello_selectedList');
          if (savedList && listsData.some(l => l.id === savedList)) {
            const cardsData = await getTrelloCards({ listId: savedList });
            setCards(cardsData);
          }
        }
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
    // Scroll to form after it renders
    setTimeout(() => {
      document.getElementById('card-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

  // Open edit card form
  const handleEditCard = useCallback((card: TrelloCard) => {
    setEditingCard(card);
    setCardForm({ name: card.name, desc: card.desc || '' });
    setShowCardForm(true);
    // Scroll to form after it renders
    setTimeout(() => {
      document.getElementById('card-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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

  // Open import modal for a card
  const handleImportCard = useCallback((card: TrelloCard) => {
    if (importedCards.has(card.id)) {
      setError('Este card já foi importado para a Base de Pacientes.');
      return;
    }
    setImportingCard(card);
  }, [importedCards]);

  // Handle successful import from modal
  const handleImportSuccess = useCallback((count: number) => {
    if (importingCard) {
      setImportedCards((prev) => new Set(prev).add(importingCard.id));
      setImportSuccess(`${count} paciente(s) importado(s) do card "${importingCard.name}"!`);
      setImportingCard(null);
    }
  }, [importingCard]);

  // Handle import list success with full patient+opportunity creation
  const handleImportListSuccess = async (count: number, selectedCards: TrelloCard[]) => {
    let success = 0;

    // Iterate serially to avoid overwhelming backend/rate limits
    for (const card of selectedCards) {
      if (importedCards.has(card.id)) continue;

      try {
        // 1. Create Patient using service
        // Try importing (which creates patient in DB)
        const patient = await importPatientFromTrello(card);

        if (patient) {
          // 2. Create Opportunity
          await createOpportunity({
            patientId: patient.id,
            name: patient.name,
            phone: patient.phone,
            status: OpportunityStatus.NEW,
            keywordFound: 'Import Trello', // Could be formatted better
            notes: `Importado do Trello em ${new Date().toLocaleDateString()}\nCard: ${card.name}\n${card.desc || ''}`,
            clinicalRecords: []
          });

          // Mark as imported locally
          setImportedCards((prev) => new Set(prev).add(card.id));
          success++;
        }
      } catch (err) {
        console.error(`Failed to import card ${card.name}:`, err);
      }
    }

    if (success > 0) {
      toast.success(`${success} pacientes importados com sucesso!`);
      setImportSuccess(`${success} de ${count} cards importados com sucesso!`);
    } else {
      toast('Nenhum novo paciente importado (talvez já existam).');
    }
    setImportListModalOpen(false);
  };

  // Compute overall loading state
  const isLoading = loadingBoards || loadingLists || loadingCards;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Integração Trello</h2>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Success Alert */}
      {importSuccess && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{importSuccess}</span>
          <button
            onClick={() => setImportSuccess(null)}
            className="text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Board Selection */}
      <div className="mb-4">
        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
          Boards:
          {loadingBoards && (
            <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm font-normal">Carregando...</span>
          )}
        </label>
        <select
          onChange={(e) => handleBoardSelect(e.target.value)}
          value={selectedBoard || ''}
          className="w-full md:w-auto border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Listas:
            {loadingLists && (
              <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm font-normal">Carregando...</span>
            )}
          </label>
          {lists.length > 0 ? (
            <select
              onChange={(e) => handleListSelect(e.target.value)}
              value={selectedList || ''}
              className="w-full md:w-auto border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma lista encontrada neste board</p>
            )
          )}
        </div>
      )}

      {/* Action Buttons */}
      {selectedList && (
        <div className="mb-4 flex gap-2">
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleOpenCreateCard}
            disabled={cardActionLoading || showCardForm}
          >
            + Novo Card
          </button>
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={() => setImportListModalOpen(true)}
            disabled={cardActionLoading || validCards.length === 0}
          >
            📥 Importar Lista ({validCards.length} cards)
          </button>
        </div>
      )}

      {/* Card Form */}
      {showCardForm && (
        <form
          id="card-form"
          className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 shadow-sm"
          onSubmit={handleCardFormSubmit}
        >
          <h4 className="font-semibold mb-3 text-lg text-gray-800 dark:text-white">
            {editingCard ? 'Editar Card' : 'Novo Card'}
          </h4>

          <div className="mb-3">
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
              value={cardForm.name}
              onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
              maxLength={MAX_CARD_NAME_LENGTH}
              required
              placeholder="Digite o título do card"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {cardForm.name.length}/{MAX_CARD_NAME_LENGTH}
            </span>
          </div>

          <div className="mb-3">
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
              value={cardForm.desc}
              onChange={(e) => setCardForm({ ...cardForm, desc: e.target.value })}
              maxLength={MAX_CARD_DESC_LENGTH}
              rows={3}
              placeholder="Digite a descrição do card (opcional)"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {cardForm.desc.length}/{MAX_CARD_DESC_LENGTH}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={cardActionLoading || !cardForm.name.trim()}
            >
              {cardActionLoading ? 'Salvando...' : editingCard ? 'Salvar' : 'Criar'}
            </button>
            <button
              type="button"
              className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-4 py-2 rounded disabled:opacity-50 transition-colors"
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
          <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">
            Cards
            {loadingCards && (
              <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm font-normal">Carregando...</span>
            )}
          </h3>

          {validCards.length > 0 ? (
            <ul className="space-y-2">
              {validCards.map((card) => (
                <li
                  key={card.id}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 rounded flex justify-between items-start hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-gray-900 dark:text-white">{card.name}</div>
                    {card.desc && (
                      <div className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">{card.desc}</div>
                    )}
                    {card.url && (
                      <a
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 dark:text-blue-400 hover:underline mt-1 block truncate"
                      >
                        {card.shortUrl || card.url}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <button
                      className={`transition-colors disabled:opacity-50 ${importedCards.has(card.id)
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300'
                        }`}
                      onClick={() => handleImportCard(card)}
                      disabled={cardActionLoading || importedCards.has(card.id)}
                      title={importedCards.has(card.id) ? 'Já importado' : 'Importar para Base de Pacientes'}
                    >
                      {importedCards.has(card.id) ? 'Importado' : 'Importar'}
                    </button>
                    <button
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 transition-colors"
                      onClick={() => handleEditCard(card)}
                      disabled={cardActionLoading}
                    >
                      Editar
                    </button>
                    <button
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Nenhum card encontrado nesta lista. Clique em &quot;+ Novo Card&quot; para criar um.
              </p>
            )
          )}
        </div>
      )}

      {/* Empty state */}
      {!selectedBoard && !isLoading && boards.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Nenhum board encontrado.</p>
          <p className="text-sm mt-2">
            Verifique se o Trello está configurado corretamente nas Configurações.
          </p>
        </div>
      )}

      {/* Import Modal */}
      <TrelloImportModal
        isOpen={!!importingCard}
        onClose={() => setImportingCard(null)}
        cardName={importingCard?.name || ''}
        cardDesc={importingCard?.desc || ''}
        onImportSuccess={handleImportSuccess}
      />

      {/* Import List Modal */}
      <ImportTrelloListModal
        isOpen={importListModalOpen}
        onClose={() => setImportListModalOpen(false)}
        listName={lists.find(l => l.id === selectedList)?.name || ''}
        cards={validCards}
        onImportSuccess={handleImportListSuccess}
      />
    </div>
  );
}
