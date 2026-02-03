import React, { useState, useEffect } from 'react';
import {
    X,
    Search,
    Import,
    CheckCircle,
    XCircle,
    Loader2,
    Check,
    Users
} from 'lucide-react';
import { TrelloCard } from '../services/trelloService';

// Extended TrelloCard with selection state for this component
interface TrelloCardWithSelection extends TrelloCard {
    selected: boolean;
}

interface ImportTrelloListModalProps {
    isOpen: boolean;
    onClose: () => void;
    listName: string;
    cards: TrelloCard[];
    onImportSuccess: (count: number, selectedCards: TrelloCard[]) => Promise<void>;
}

export const ImportTrelloListModal = ({
    isOpen,
    onClose,
    listName,
    cards,
    onImportSuccess,
}: ImportTrelloListModalProps) => {
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [localCards, setLocalCards] = useState<TrelloCardWithSelection[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Initialize/Reset local state when modal opens or cards prop changes
    useEffect(() => {
        if (isOpen) {
            setLocalCards(cards.map(c => ({ ...c, selected: true })));
            setSearchTerm('');
            setError(null);
        }
    }, [isOpen, cards]);

    const toggleCard = (cardId: string) => {
        setLocalCards((prev) =>
            prev.map((card) =>
                card.id === cardId ? { ...card, selected: !card.selected } : card
            )
        );
    };

    const toggleAll = (selected: boolean) => {
        setLocalCards((prev) => prev.map((card) => ({ ...card, selected })));
    };

    const handleImport = async () => {
        const selectedCards = localCards.filter((c) => c.selected);
        if (selectedCards.length === 0) {
            setError('Selecione pelo menos um card para importar');
            return;
        }

        setImporting(true);
        setError(null);
        try {
            await onImportSuccess(selectedCards.length, selectedCards);
            // Close is handled by parent after success or let parent decide
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao importar cards');
        } finally {
            setImporting(false);
        }
    };

    const filteredCards = localCards.filter(
        (card) =>
            card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (card.desc && card.desc.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const selectedCount = localCards.filter((c) => c.selected).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />

                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Import size={24} className="text-blue-600" />
                                Importar Lista do Trello
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Importando cards da lista: <span className="font-semibold text-gray-700 dark:text-gray-300">{listName}</span>
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                                <XCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
                                <input
                                    type="text"
                                    placeholder="Buscar cards..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                                />
                            </div>

                            {/* Select All Controls */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">
                                    {selectedCount} de {localCards.length} selecionados
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => toggleAll(true)}
                                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                                    >
                                        Selecionar todos
                                    </button>
                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                    <button
                                        onClick={() => toggleAll(false)}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm transition-colors"
                                    >
                                        Limpar seleção
                                    </button>
                                </div>
                            </div>

                            {/* Cards List */}
                            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                                {filteredCards.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                        <Users size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                        <p>Nenhum card encontrado.</p>
                                    </div>
                                ) : (
                                    filteredCards.map((card) => (
                                        <div
                                            key={card.id}
                                            onClick={() => toggleCard(card.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${card.selected
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm'
                                                : 'bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500' // faded if not selected
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${card.selected
                                                        ? 'bg-blue-600 border-blue-600'
                                                        : 'border-gray-300 dark:border-gray-500'
                                                        }`}
                                                >
                                                    {card.selected && <Check size={14} className="text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-medium truncate transition-colors ${card.selected ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {card.name}
                                                    </p>
                                                    {card.desc && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                                                            {card.desc}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0">
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            {selectedCount > 0 ? (
                                <>
                                    <CheckCircle size={16} className="text-green-500" />
                                    <span>{selectedCount} pronto(s) para importar</span>
                                </>
                            ) : (
                                <>
                                    <XCircle size={16} className="text-gray-400" />
                                    <span>Selecione cards para importar</span>
                                </>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing || selectedCount === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-sm"
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
                </div>
            </div>
        </div>
    );
};

export default ImportTrelloListModal;

