from helper import create_folder_if_not_exists, delete_folder_if_exists

def split_file(file_path, chunk_path, chunk_size):
    file_number = 0
    with open(file_path, 'rb') as file:
        chunk = file.read(chunk_size)
        while chunk:
            with open(f"{chunk_path}.part{file_number}", 'wb') as chunk_file:
                chunk_file.write(chunk)
            file_number += 1
            chunk = file.read(chunk_size)


modelname="rwkv4-small"
# modelname="rwkv4-medium"
# modelname="rwkv4-large"

# folder_path = f'src/utils/model/rwkv/{modelname}/params_output/'

# onnx_path = folder_path + modelname + '.onnx'
# onnx_path = folder_path + modelname + '-quant.onnx'
onnx_path = 'static/rwkv/rwkv-4-pile-169m-uint8.onnx'

chunk_folder_path = f'static/rwkv/{modelname}/'
# chunk_path = chunk_folder_path + modelname +'.onnx'
chunk_path = chunk_folder_path + 'rwkv-4-pile-169m-uint8.onnx'

delete_folder_if_exists(chunk_folder_path)
create_folder_if_not_exists(chunk_folder_path)

chunk_size = 50 * 1024 * 1024  # chunk by 50MB
split_file(onnx_path, chunk_path, chunk_size)