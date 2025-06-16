# Hospital Management System

## Description
This project is a web application for managing hospital operations, including hospital information, patient booking, staff details, and reviews.

## Features
- View hospital details
- Search for hospitals by location and specialty
- Book hospital beds
- Manage patient information
- View doctor and nurse details
- Leave reviews for hospitals and doctors

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/joyasturay/HospitalManagamenet.git
    ```
    ```bash
    cd HospitalManagamenet
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add your MongoDB connection string:
    ```plaintext
    MONGO_URL=your_mongodb_connection_string
    ```
    Replace `your_mongodb_connection_string` with your actual MongoDB connection URL.

4.  **Start the server:**
    ```bash
    node app.js
    ```
    The application should now be running on `http://localhost:8080`.

## Usage
- Navigate to `http://localhost:8080` in your web browser.
- Use the navigation to explore hospitals, search, and book beds.

## Technologies Used
- Node.js
- Express.js
- MongoDB
- Mongoose
- EJS (Embedded JavaScript templating)
- Bootstrap
- dotenv

## Contributing
Contributions are welcome! Please feel free to open issues or submit pull requests.

## License
[Specify your license here, e.g., MIT, Apache 2.0, etc.]
