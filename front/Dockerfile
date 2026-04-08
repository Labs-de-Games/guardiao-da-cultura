# Estágio único: Node.js
FROM node:lts-alpine

# Define o diretório
WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./

# Instala as dependências e o pacote 'serve' (servidor estático leve)
RUN npm install && npm install -g serve

# Copia o restante do código
COPY . .

# Faz o build do projeto (ex: gera a pasta dist)
RUN npm run build

EXPOSE 3000

# Comando para rodar o servidor na pasta 'dist' (ou 'build')
# O parâmetro -s serve para Single Page Applications (SPA)
CMD ["serve", "-s", "dist", "-l", "3000"]