#!/usr/bin/env python3
"""
Advanced Machine Learning Implementation
=========================================

This module implements various machine learning algorithms with optimization
techniques for improved performance and accuracy.

Author: AI Research Team
Version: 2.1.0
License: MIT
"""

import numpy as np
import matplotlib.pyplot as plt
from typing import List, Tuple, Optional
from dataclasses import dataclass
from abc import ABC, abstractmethod


@dataclass
class ModelConfig:
    """Configuration parameters for ML models."""
    learning_rate: float = 0.01
    epochs: int = 1000
    batch_size: int = 32
    regularization: float = 0.001


class BaseModel(ABC):
    """Abstract base class for all ML models."""
    
    def __init__(self, config: ModelConfig):
        self.config = config
        self.trained = False
        self.loss_history = []
    
    @abstractmethod
    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        """Train the model on given data."""
        pass
    
    @abstractmethod
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions on new data."""
        pass
    
    def evaluate(self, X: np.ndarray, y: np.ndarray) -> dict:
        """Evaluate model performance."""
        predictions = self.predict(X)
        mse = np.mean((y - predictions) ** 2)
        mae = np.mean(np.abs(y - predictions))
        
        return {
            'mse': mse,
            'mae': mae,
            'rmse': np.sqrt(mse)
        }


class LinearRegression(BaseModel):
    """Implementation of Linear Regression with gradient descent."""
    
    def __init__(self, config: ModelConfig):
        super().__init__(config)
        self.weights = None
        self.bias = None
    
    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        """
        Train linear regression model using gradient descent.
        
        Mathematical formulation:
        θ = θ - α * (1/m) * X^T * (X*θ - y)
        
        Args:
            X: Training features (m x n)
            y: Training targets (m x 1)
        """
        m, n = X.shape
        self.weights = np.random.normal(0, 0.01, n)
        self.bias = 0
        
        for epoch in range(self.config.epochs):
            # Forward pass
            y_pred = X @ self.weights + self.bias
            
            # Compute loss (MSE with L2 regularization)
            loss = np.mean((y - y_pred) ** 2)
            reg_loss = self.config.regularization * np.sum(self.weights ** 2)
            total_loss = loss + reg_loss
            
            # Backward pass
            dw = (2/m) * X.T @ (y_pred - y) + 2 * self.config.regularization * self.weights
            db = (2/m) * np.sum(y_pred - y)
            
            # Update parameters
            self.weights -= self.config.learning_rate * dw
            self.bias -= self.config.learning_rate * db
            
            # Store loss for monitoring
            if epoch % 100 == 0:
                self.loss_history.append(total_loss)
                print(f"Epoch {epoch}: Loss = {total_loss:.6f}")
        
        self.trained = True
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions using trained model."""
        if not self.trained:
            raise ValueError("Model must be trained before making predictions")
        
        return X @ self.weights + self.bias


class NeuralNetwork(BaseModel):
    """Simple feedforward neural network implementation."""
    
    def __init__(self, config: ModelConfig, hidden_sizes: List[int]):
        super().__init__(config)
        self.hidden_sizes = hidden_sizes
        self.layers = []
        
    def _initialize_weights(self, input_size: int, output_size: int):
        """Initialize weights using Xavier initialization."""
        sizes = [input_size] + self.hidden_sizes + [output_size]
        self.layers = []
        
        for i in range(len(sizes) - 1):
            # Xavier initialization
            limit = np.sqrt(6 / (sizes[i] + sizes[i + 1]))
            weight = np.random.uniform(-limit, limit, (sizes[i], sizes[i + 1]))
            bias = np.zeros((1, sizes[i + 1]))
            self.layers.append({'weight': weight, 'bias': bias})
    
    def _sigmoid(self, x: np.ndarray) -> np.ndarray:
        """Sigmoid activation function."""
        return 1 / (1 + np.exp(-np.clip(x, -500, 500)))  # Prevent overflow
    
    def _sigmoid_derivative(self, x: np.ndarray) -> np.ndarray:
        """Derivative of sigmoid function."""
        s = self._sigmoid(x)
        return s * (1 - s)
    
    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        """Train neural network using backpropagation."""
        m, n = X.shape
        output_size = 1 if len(y.shape) == 1 else y.shape[1]
        
        self._initialize_weights(n, output_size)
        
        for epoch in range(self.config.epochs):
            # Forward propagation
            activations = [X]
            current_input = X
            
            for layer in self.layers:
                z = current_input @ layer['weight'] + layer['bias']
                current_input = self._sigmoid(z)
                activations.append(current_input)
            
            # Compute loss
            loss = np.mean((y.reshape(-1, 1) - activations[-1]) ** 2)
            
            # Backward propagation
            delta = (activations[-1] - y.reshape(-1, 1)) * self._sigmoid_derivative(activations[-1])
            
            for i in range(len(self.layers) - 1, -1, -1):
                # Compute gradients
                dW = activations[i].T @ delta / m
                db = np.mean(delta, axis=0, keepdims=True)
                
                # Update weights
                self.layers[i]['weight'] -= self.config.learning_rate * dW
                self.layers[i]['bias'] -= self.config.learning_rate * db
                
                # Propagate error backwards
                if i > 0:
                    delta = (delta @ self.layers[i]['weight'].T) * self._sigmoid_derivative(activations[i])
            
            if epoch % 100 == 0:
                self.loss_history.append(loss)
                print(f"Epoch {epoch}: Loss = {loss:.6f}")
        
        self.trained = True
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions using trained neural network."""
        if not self.trained:
            raise ValueError("Model must be trained before making predictions")
        
        current_input = X
        for layer in self.layers:
            z = current_input @ layer['weight'] + layer['bias']
            current_input = self._sigmoid(z)
        
        return current_input.flatten()


def generate_synthetic_data(n_samples: int = 1000, noise_level: float = 0.1) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic regression data for testing.
    
    Args:
        n_samples: Number of samples to generate
        noise_level: Amount of noise to add to the target
    
    Returns:
        Tuple of (features, targets)
    """
    X = np.random.randn(n_samples, 3)
    # True relationship: y = 2*x1 - 1.5*x2 + 0.8*x3 + noise
    y = 2 * X[:, 0] - 1.5 * X[:, 1] + 0.8 * X[:, 2] + noise_level * np.random.randn(n_samples)
    
    return X, y


def main():
    """Main execution function for demonstrating the ML algorithms."""
    print("🤖 Advanced Machine Learning Demo")
    print("=" * 50)
    
    # Generate synthetic data
    X_train, y_train = generate_synthetic_data(800, noise_level=0.1)
    X_test, y_test = generate_synthetic_data(200, noise_level=0.1)
    
    # Configure models
    config = ModelConfig(learning_rate=0.01, epochs=1000, regularization=0.001)
    
    # Train Linear Regression
    print("\n📊 Training Linear Regression...")
    lr_model = LinearRegression(config)
    lr_model.fit(X_train, y_train)
    
    lr_metrics = lr_model.evaluate(X_test, y_test)
    print(f"Linear Regression Results: {lr_metrics}")
    
    # Train Neural Network
    print("\n🧠 Training Neural Network...")
    nn_model = NeuralNetwork(config, hidden_sizes=[10, 5])
    nn_model.fit(X_train, y_train)
    
    nn_metrics = nn_model.evaluate(X_test, y_test)
    print(f"Neural Network Results: {nn_metrics}")
    
    # Compare models
    print("\n🏆 Model Comparison:")
    print(f"Linear Regression RMSE: {lr_metrics['rmse']:.4f}")
    print(f"Neural Network RMSE: {nn_metrics['rmse']:.4f}")
    
    if lr_metrics['rmse'] < nn_metrics['rmse']:
        print("✨ Linear Regression performs better on this dataset!")
    else:
        print("✨ Neural Network performs better on this dataset!")


if __name__ == "__main__":
    main()