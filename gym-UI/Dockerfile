# Stage 1: Build Angular application
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --force
COPY . .
RUN npm run build --configuration=production

# Stage 2: Serve application with Nginx
FROM nginx:alpine
COPY --from=build /app/dist/gym-ui/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
