import { glob } from 'glob';
import path from 'path';

export const scanFiles = async (directory) => {
    try {
        // glob **/*.{json,txt,md}
        const pattern = path.join(directory, '**/*.+(json|txt|md)').replace(/\\/g, '/');
        const files = await glob(pattern);
        return files;
    } catch (error) {
        console.error('Error scanning files:', error);
        throw error;
    }
};
