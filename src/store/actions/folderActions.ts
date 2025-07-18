import { StateCreator } from 'zustand';
import { AppStore, FolderActions } from '../types';
import { 
  FolderData, 
  ValidationResult, 
  ComparisonResult 
} from '../../types';

export const createFolderActions: StateCreator<
  AppStore,
  [['zustand/immer', never]],
  [],
  FolderActions
> = (set, _get, _api) => ({
  setFolders: (folders: FolderData) => {
    set((state) => {
      state.folders = folders;
    });
  },
  
  setValidationResult: (result: ValidationResult | null) => {
    set((state) => {
      state.validationResult = result;
    });
  },
  
  setComparisonResults: (results: ComparisonResult[]) => {
    set((state) => {
      state.comparisonResults = results;
    });
  },
  
  setLoading: (loading: boolean) => {
    set((state) => {
      state.loading = loading;
    });
  },
  
  setError: (error: string | null) => {
    set((state) => {
      state.error = error;
    });
  },
  
  resetState: () => {
    set((state) => {
      state.folders = {
        original: '',
        gt: '',
        my: '',
        comparison: []
      };
      state.validationResult = null;
      state.comparisonResults = [];
      state.loading = false;
      state.error = null;
      state.currentHistoryRecordId = null;
      state.isUsingCache = false;
    });
  }
}); 