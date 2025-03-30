import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['Standard', 'Deluxe', 'Suite', 'Presidential'],
    default: 'Standard'
  },
  capacity: {
    type: Number,
    default: 2
  },
  price: {
    type: Number,
    required: true
  },
  amenities: {
    type: [String],
    default: ['WiFi', 'TV']
  },
  available: {
    type: Boolean,
    default: true
  }
});

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 4.5
  },
  reviews: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  rooms: {
    type: [roomSchema],
    default: function() {
      // Generate 10 default rooms with fixed prices instead of referencing this.price
      const defaultRooms = [];
      const basePrice = 100; // Default base price
      
      for(let i = 101; i <= 110; i++) {
        const roomType = i % 4 === 0 ? 'Deluxe' : i % 4 === 1 ? 'Suite' : 'Standard';
        // Adjust price based on room type
        let roomPrice = basePrice;
        if (roomType === 'Deluxe') roomPrice = 150;
        if (roomType === 'Suite') roomPrice = 200;
        
        defaultRooms.push({
          roomNumber: i,
          type: roomType,
          capacity: i % 3 + 1,
          price: roomPrice, // Use calculated price instead of this.price
          available: true
        });
      }
      return defaultRooms;
    }
  },
  amenities: {
    type: [String],
    default: ['WiFi', 'Parking', 'Breakfast', 'Pool']
  },
  policies: {
    checkInTime: {
      type: String,
      default: "14:00"
    },
    checkOutTime: {
      type: String,
      default: "11:00"
    },
    cancellationPolicy: {
      type: String,
      default: "Free cancellation up to 24 hours before check-in"
    },
    stripePriceId: {
      type: String,
    }
  }
});

const Hotel = mongoose.model("Hotel", hotelSchema);

export default Hotel;