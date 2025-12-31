import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { parent_id, step, completed_steps, form_data } = await request.json();

    if (!parent_id || !step) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // First, check if a progress record already exists for this parent
    const { data: existingRecord } = await supabase
      .from('store_registration_progress')
      .select('*')
      .eq('parent_id', parent_id)
      .single();

    let result;

    if (existingRecord) {
      // Update existing record
      const existingData = existingRecord.form_data || {};
      
      // Merge the new step data with existing data
      const updatedData = {
        ...existingData,
        ...form_data
      };

      result = await supabase
        .from('store_registration_progress')
        .update({
          step,
          completed_steps,
          form_data: updatedData,
          updated_at: new Date().toISOString()
        })
        .eq('parent_id', parent_id)
        .select()
        .single();
    } else {
      // Create new record
      result = await supabase
        .from('store_registration_progress')
        .insert({
          parent_id,
          step,
          completed_steps,
          form_data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    return NextResponse.json({
      success: true,
      message: 'Progress saved successfully',
      data: result.data
    });

  } catch (error: any) {
    console.error('Error saving progress:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save progress' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parent_id = searchParams.get('parent_id');

    if (!parent_id) {
      return NextResponse.json(
        { error: 'Missing parent_id parameter' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('store_registration_progress')
      .select('*')
      .eq('parent_id', parent_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found
        return NextResponse.json({
          found: false,
          completed_steps: 0
        });
      }
      throw error;
    }

    return NextResponse.json({
      found: true,
      completed_steps: data.completed_steps || 0,
      form_data: data.form_data || {},
      store_id: data.store_id || null
    });

  } catch (error: any) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parent_id = searchParams.get('parent_id');

    if (!parent_id) {
      return NextResponse.json(
        { error: 'Missing parent_id parameter' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('store_registration_progress')
      .delete()
      .eq('parent_id', parent_id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Progress deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting progress:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete progress' },
      { status: 500 }
    );
  }
}