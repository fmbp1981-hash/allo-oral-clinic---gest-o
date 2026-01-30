import React, { useState, useEffect } from 'react';
import {
    X,
    Search,
    Import,
    CheckCircle,
    XCircle,
    Loader2,
    List,
    Users,
    AlertCircle,
    Check,
    ChevronRight
} from 'lucide-react';

interface TrelloCard {
    id: string;
    name: string;
    desc: string;
    labels: { name: string; color: string }[];
    due?: string;
    selected?: boolean;
}

interface TrelloList {
    id: string;
    name: string;
    cards: TrelloCard[];
}

interface ImportTrelloListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (cards: TrelloCard[]) => Promise<void>;
    boardId?: string;
}

export const ImportTrelloListModal = ({
    isOpen,
    onClose,
    onImport,
    boardId,
}: ImportTrelloListModalProps) => {
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lists, setLists] = useState<TrelloList[]>([]);
    const [selectedList, setSelectedList] = useState<TrelloList | null>(null);
    const [cards, setCards] = useState<TrelloCard[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [step, setStep] = useState<'lists' | 'cards'>('lists');

    useEffect(() => {
        if (isOpen && boardId) {
            fetchLists();
        }
    }, [isOpen, boardId]);

    const fetchLists = async () => {
        if (!boardId) {
            setError('Board não configurado');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/trello/boards/${boardId}/lists`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar listas do Trello');
            }

            const data = await response.json();
            setLists(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar listas');
        } finally {
            setLoading(false);
        }
    };

    const fetchCards = async (list: TrelloList) => {
        setSelectedList(list);
        setStep('cards');
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/trello/cards?listId=${list.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar cards');
            }

            const data = await response.json();
            setCards(data.map((card: TrelloCard) => ({ ...card, selected: true })));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar cards');
        } finally {
            setLoading(false);
        }
    };

    const toggleCard = (cardId: string) => {
        setCards((prev) =>
            prev.map((card) =>
                card.id === cardId ? { ...card, selected: !card.selected } : card
            )
        );
    };

    const toggleAll = (selected: boolean) => {
        setCards((prev) => prev.map((card) => ({ ...card, selected })));
    };

    const handleImport = async () => {
        const selectedCards = cards.filter((c) => c.selected);
        if (selectedCards.length === 0) {
            setError('Selecione pelo menos um card para importar');
            return;
        }

        setImporting(true);
        setError(null);
        try {
            await onImport(selectedCards);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao importar cards');
        } finally {
            setImporting(false);
        }
    };

    const handleBack = () => {
        setStep('lists');
        setSelectedList(null);
        setCards([]);
    };

    const filteredCards = cards.filter(
        (card) =>
            card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedCount = cards.filter((c) => c.selected).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />

                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Import size={24} className="text-blue-600" />
                                Importar do Trello
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {step === 'lists'
                                    ? 'Selecione uma lista para importar'
                                    : `Lista: ${selectedList?.name}`}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-blue-600" size={32} />
                            </div>
                        ) : step === 'lists' ? (
                            /* Lists Selection */
                            <div className="space-y-3">
                                {lists.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                        <List size={40} className="mx-auto mb-3 text-gray-300" />
                                        <p>Nenhuma lista encontrada no board.</p>
                                    </div>
                                ) : (
                                    lists.map((list) => (
                                        <button
                                            key={list.id}
                                            onClick={() => fetchCards(list)}
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <List size={20} className="text-gray-400 group-hover:text-blue-600" />
                                                <span className="font-medium text-gray-800 dark:text-white">
                                                    {list.name}
                                                </span>
                                            </div>
                                            <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-600" />
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : (
                            /* Cards Selection */
                            <div className="space-y-4">
                                {/* Back Button */}
                                <button
                                    onClick={handleBack}
                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    ← Voltar para listas
                                </button>

                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
                                    <input
                                        type="text"
                                        placeholder="Buscar cards..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Select All */}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {selectedCount} de {cards.length} selecionados
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleAll(true)}
                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            Selecionar todos
                                        </button>
                                        <span className="text-gray-300">|</span>
                                        <button
                                            onClick={() => toggleAll(false)}
                                            className="text-gray-500 hover:text-gray-700 text-sm"
                                        >
                                            Limpar seleção
                                        </button>
                                    </div>
                                </div>

                                {/* Cards List */}
                                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                                    {filteredCards.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            <Users size={32} className="mx-auto mb-2 text-gray-300" />
                                            <p>Nenhum card encontrado.</p>
                                        </div>
                                    ) : (
                                        filteredCards.map((card) => (
                                            <div
                                                key={card.id}
                                                onClick={() => toggleCard(card.id)}
                                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${card.selected
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${card.selected
                                                                ? 'bg-blue-600 border-blue-600'
                                                                : 'border-gray-300 dark:border-gray-500'
                                                            }`}
                                                    >
                                                        {card.selected && <Check size={14} className="text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                                            {card.name}
                                                        </p>
                                                        {card.desc && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                                {card.desc}
                                                            </p>
                                                        )}
                                                        {card.labels?.length > 0 && (
                                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                                {card.labels.map((label, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-700"
                                                                    >
                                                                        {label.name || label.color}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {step === 'cards' && (
                        <div className="flex justify-between items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0">
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                {selectedCount > 0 ? (
                                    <>
                                        <CheckCircle size={16} className="text-green-500" />
                                        {selectedCount} card(s) para importar
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={16} className="text-gray-400" />
                                        Nenhum card selecionado
                                    </>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={importing || selectedCount === 0}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {importing ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Importando...
                                        </>
                                    ) : (
                                        <>
                                            <Import size={16} />
                                            Importar {selectedCount} Card(s)
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportTrelloListModal;
