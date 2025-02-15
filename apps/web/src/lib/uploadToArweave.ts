import { METADATA_WORKER_URL } from '@lenster/data/constants';
import Errors from '@lenster/data/errors';
import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Uploads the given data to Arweave.
 *
 * @param data The data to upload.
 * @returns The Arweave transaction ID.
 * @throws An error if the upload fails.
 */
const uploadToArweave = async (data: any): Promise<string> => {
  try {
    const upload = await axios(METADATA_WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data
    });

    const { id }: { id: string } = upload?.data;

    return id;
  } catch (error) {
    console.error('Failed to upload to Arweave', error);
    toast.error(Errors.SomethingWentWrong);
    throw new Error(Errors.SomethingWentWrong);
  }
};

export default uploadToArweave;
