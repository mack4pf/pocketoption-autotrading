import React, { createContext, useContext, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faTriangleExclamation, faCircleInfo, faCircleXmark, faTimes } from '@fortawesome/free-solid-svg-icons';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info', // 'success', 'warning', 'error', 'info', 'confirm'
        onConfirm: null,
        onCancel: null
    });

    const showModal = useCallback(({ title, message, type = 'info', onConfirm, onCancel }) => {
        setModal({
            isOpen: true,
            title,
            message,
            type,
            onConfirm,
            onCancel
        });
    }, []);

    const closeModal = useCallback(() => {
        setModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleConfirm = () => {
        if (modal.onConfirm) modal.onConfirm();
        closeModal();
    };

    const handleCancel = () => {
        if (modal.onCancel) modal.onCancel();
        closeModal();
    };

    return (
        <ModalContext.Provider value={{ showModal, closeModal }}>
            {children}
            {modal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-gray-800 border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${modal.type === 'success' ? 'bg-green-500/20 text-green-500' :
                                        modal.type === 'error' ? 'bg-red-500/20 text-red-500' :
                                            modal.type === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                                                'bg-blue-500/20 text-blue-500'
                                    }`}>
                                    <FontAwesomeIcon icon={
                                        modal.type === 'success' ? faCircleCheck :
                                            modal.type === 'error' ? faCircleXmark :
                                                modal.type === 'warning' ? faTriangleExclamation :
                                                    faCircleInfo
                                    } size="lg" />
                                </div>
                                <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{modal.title}</h3>
                            <div className="text-gray-400 whitespace-pre-wrap">{modal.message}</div>
                        </div>

                        <div className="bg-gray-750 p-4 flex gap-3 justify-end">
                            {modal.type === 'confirm' ? (
                                <>
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-2 rounded-lg text-gray-400 hover:text-white font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-all"
                                    >
                                        Confirm
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={closeModal}
                                    className={`px-8 py-2 rounded-lg font-bold transition-all ${modal.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                                            modal.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                                                'bg-blue-600 hover:bg-blue-700'
                                        } text-white`}
                                >
                                    OK
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) throw new Error('useModal must be used within a ModalProvider');
    return context;
};
