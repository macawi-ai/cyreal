/**
 * Platform-agnostic GPIO interface for cross-platform compatibility
 */
export interface IGpioController {
  /**
   * Write a digital value to the GPIO pin
   */
  write(value: 0 | 1): Promise<void>;
  
  /**
   * Read the current value of the GPIO pin
   */
  read(): Promise<0 | 1>;
  
  /**
   * Set the direction of the GPIO pin
   */
  setDirection(direction: 'in' | 'out'): Promise<void>;
  
  /**
   * Clean up and release the GPIO pin
   */
  unexport(): Promise<void>;
}

/**
 * Factory function type for creating platform-specific GPIO controllers
 */
export type GpioControllerFactory = (pin: number) => Promise<IGpioController>;

/**
 * GPIO capabilities for different platforms
 */
export interface GpioCapabilities {
  available: boolean;
  maxPins?: number;
  features?: string[];
}